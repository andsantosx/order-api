import { AppDataSource } from '../../data-source';
import { Notification, NotificationType } from '../entities/Notification';
import { User } from '../entities/User';
import { SocketService } from './SocketService';
import { EmailService } from './EmailService';
import { log } from '../../config/logger';
import { injectable, container } from 'tsyringe';
import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';

@injectable()
export class NotificationService {
  private notificationRepository = AppDataSource.getRepository(Notification);
  private userRepository = AppDataSource.getRepository(User);
  private socketService = SocketService.getInstance();

  /**
   * Envia uma notificação para um usuário específico.
   * Salva no banco de dados, emite via WebSocket e opcionalmente envia e-mail.
   */
  async createNotification(
    userId: string,
    title: string,
    content: string,
    type: NotificationType,
    link?: string,
    sendEmail: boolean = false,
  ): Promise<Notification> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      log.warn(`[NotificationService] Usuário ${userId} não encontrado para envio de notificação.`);
      throw new AppError('Usuário não encontrado', HTTP_STATUS.NOT_FOUND);
    }

    const notification = this.notificationRepository.create({
      userId,
      title,
      content,
      type,
      link,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Emitir via WebSocket em tempo real
    this.socketService.emitToUser(userId, 'new_notification', savedNotification);

    // Enviar e-mail de engajamento se solicitado
    if (sendEmail) {
      try {
        const emailService = container.resolve(EmailService);
        if (type === NotificationType.CART_ABANDONED) {
          // E-mail de abandono de carrinho
          await emailService.sendAbandonedCartEmail(user.email, user.name, link || '');
        } else if (type === NotificationType.CHECKOUT_ABANDONED) {
          // E-mail de abandono de compra
          await emailService.sendAbandonedCheckoutEmail(user.email, user.name, link || '');
        } else {
          // Campanhas ou atualizações
          await emailService.sendCustomCampaignEmail(
            user.email,
            user.name,
            title,
            title,
            content,
            'Ver na loja',
            link || '',
          );
        }
      } catch (error) {
        log.error(`[NotificationService] Erro ao enviar e-mail de notificação para ${user.email}:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    log.info(`[NotificationService] Notificação criada para usuário ${userId}: ${title}`);
    return savedNotification;
  }

  /**
   * Envia uma notificação em massa (broadcast) para todos os usuários cadastrados.
   */
  async broadcastNotification(
    title: string,
    content: string,
    type: NotificationType,
    link?: string,
    sendEmail: boolean = false,
  ): Promise<void> {
    log.info(`[NotificationService] Iniciando transmissão em massa: "${title}"`);

    // Busca todos os usuários
    const users = await this.userRepository.find({ select: ['id', 'email', 'name'] });

    if (users.length === 0) {
      log.info('[NotificationService] Nenhum usuário encontrado para transmissão.');
      return;
    }

    // Criar notificações em lote (loteamento para evitar estouro de memória e lentidão)
    const notificationsToSave = users.map((u) => {
      return this.notificationRepository.create({
        userId: u.id,
        title,
        content,
        type,
        link,
      });
    });

    // Salvar em blocos de 100
    const chunkSize = 100;
    for (let i = 0; i < notificationsToSave.length; i += chunkSize) {
      const chunk = notificationsToSave.slice(i, i + chunkSize);
      await this.notificationRepository.save(chunk);
    }

    // Emitir broadcast WebSocket geral
    this.socketService.broadcast('global_notification', { title, content, type, link });

    // Enviar emails se solicitado
    if (sendEmail) {
      // Dispara o envio em segundo plano sem travar a thread HTTP/Express
      this.sendBroadcastEmailsInBackground(users, type, title, content, link);
    }

    log.info(`[NotificationService] Transmissão finalizada para ${users.length} usuários.`);
  }

  /**
   * Envia e-mails em lote em segundo plano para todos os usuários do broadcast.
   */
  private async sendBroadcastEmailsInBackground(
    users: { email: string; name: string }[],
    type: NotificationType,
    title: string,
    content: string,
    link?: string,
  ): Promise<void> {
    log.info(`[NotificationService] Envio em lote de e-mails iniciado em segundo plano para ${users.length} usuários.`);
    const emailService = container.resolve(EmailService);
    
    // Tamanho do lote e delay entre lotes para evitar sobrecarga de conexões e rate limits
    const batchSize = 10;
    const delayBetweenBatchesMs = 100;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (u) => {
          try {
            if (type === NotificationType.NEW_PRODUCT) {
              await emailService.sendNewProductEmail(u.email, u.name, title, link || '', content);
            } else if (type === NotificationType.NEW_CATEGORY) {
              await emailService.sendNewCategoryEmail(u.email, u.name, title, link || '', content);
            } else {
              await emailService.sendCustomCampaignEmail(
                u.email,
                u.name,
                title,
                title,
                content,
                'Ver Detalhes',
                link || '',
              );
            }
          } catch (error) {
            log.error(`[NotificationService] Falha ao enviar broadcast por e-mail para ${u.email}:`, {
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        })
      );

      // Aguarda um pequeno intervalo entre os lotes
      if (i + batchSize < users.length) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchesMs));
      }
    }

    log.info(`[NotificationService] Envio em lote de e-mails em segundo plano finalizado para ${users.length} usuários.`);
  }

  /**
   * Retorna as notificações de um usuário.
   */
  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    return this.notificationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50, // Limita às 50 mais recentes
    });
  }

  /**
   * Marca uma notificação específica como lida.
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOneBy({ id: notificationId, userId });
    if (!notification) {
      throw new AppError('Notificação não encontrada', HTTP_STATUS.NOT_FOUND);
    }

    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  /**
   * Marca todas as notificações de um usuário como lidas.
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update({ userId, isRead: false }, { isRead: true });
    log.info(`[NotificationService] Todas as notificações marcadas como lidas para usuário ${userId}`);
  }
}
