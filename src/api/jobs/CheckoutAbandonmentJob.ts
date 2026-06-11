import cron from 'node-cron';
import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
import { Notification, NotificationType } from '../entities/Notification';
import { User } from '../entities/User';
import { NotificationService } from '../services/NotificationService';
import { env } from '../../config/env';
import { log } from '../../config/logger';
import { LessThan, MoreThan, Like, In } from 'typeorm';
import { container } from 'tsyringe';

export class CheckoutAbandonmentJob {
  private static isRunning = false;
  private static notificationService = container.resolve(NotificationService);

  /**
   * Executa a busca e notificação de checkouts abandonados (pedidos PENDING ou PROCESSING).
   */
  public static async checkAbandonments(): Promise<void> {
    if (this.isRunning) {
      log.debug('[CheckoutAbandonmentJob] Já existe uma execução em curso. Pulando...');
      return;
    }

    this.isRunning = true;
    log.info('[CheckoutAbandonmentJob] Verificando checkouts abandonados...');

    const orderRepository = AppDataSource.getRepository(Order);
    const notificationRepository = AppDataSource.getRepository(Notification);

    // Definição dos thresholds de tempo:
    // Pedidos PENDING/PROCESSING criados há mais de env.CHECKOUT_ABANDONMENT_HOURS horas (padrão: 1h) e menos de 6 horas
    const now = new Date();
    const checkoutThreshold = new Date(now.getTime() - env.CHECKOUT_ABANDONMENT_HOURS * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

    try {
      // 1. Busca pedidos em status PENDING (1) ou PROCESSING (2) criados no intervalo (1h a 6h atrás)
      const pendingOrders = await orderRepository.find({
        where: {
          statusId: In([OrderStatus.PENDING, OrderStatus.PROCESSING]),
          createdAt: LessThan(checkoutThreshold),
          // Usando TypeORM relations/select para carregar o usuário
        },
        relations: ['user'],
        select: {
          id: true,
          totalAmount: true,
          createdAt: true,
          statusId: true,
          guestEmail: true,
          user: {
            id: true,
            name: true,
            email: true,
          },
        },
      });

      if (pendingOrders.length === 0) {
        log.info('[CheckoutAbandonmentJob] Nenhum pedido pendente elegível encontrado.');
        return;
      }

      log.info(`[CheckoutAbandonmentJob] Analisando abandono de checkout para ${pendingOrders.length} pedidos.`);

      let count = 0;
      for (const order of pendingOrders) {
        try {
          // Pula se for anterior ao limite de 6h (para não notificar pedidos muito antigos)
          if (order.createdAt < sixHoursAgo) {
            continue;
          }

          // Se for guest (não logado), pula (não tem userId no banco para notificação em tempo real)
          // Embora pudéssemos enviar apenas e-mail para guests, as notificações in-app exigem userId.
          // Por questões de simplicidade e foco na conta de usuário, focaremos em usuários cadastrados.
          if (!order.user || !order.user.id) {
            continue;
          }

          const userId = order.user.id;
          const targetLink = `/checkout?orderId=${order.id}`;

          // A. Verifica se o usuário já recebeu uma notificação para ESTE pedido específico
          const recentNotification = await notificationRepository.findOne({
            where: {
              userId,
              type: NotificationType.CHECKOUT_ABANDONED,
              link: Like(`%${order.id}%`),
            },
            select: ['id'],
          });

          if (recentNotification) {
            // Já notificado sobre este pedido, pula
            continue;
          }

          // Enviar notificação e e-mail
          const checkoutUrl = `${env.FRONTEND_URL}/checkout?orderId=${order.id}`;
          await this.notificationService.createNotification(
            userId,
            'Seu pedido está aguardando pagamento!',
            `Conclua o pagamento do seu pedido #${order.id.slice(0, 8)} para garantirmos o envio rápido das suas peças!`,
            NotificationType.CHECKOUT_ABANDONED,
            targetLink,
            true, // Enviar e-mail também
          );

          count++;
        } catch (error: unknown) {
          log.error(`[CheckoutAbandonmentJob] Falha ao processar checkout abandonado do pedido ${order.id}:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      log.info(`[CheckoutAbandonmentJob] Finalizado. ${count} usuários foram notificados por checkout pendente.`);
    } catch (error: unknown) {
      log.error('[CheckoutAbandonmentJob] Erro inesperado na rotina de abandono de checkout:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Inicializa o cron. Roda a cada 30 minutos.
   */
  public static init(): void {
    const cronSchedule = '0 */30 * * * *'; // A cada 30 minutos

    log.info(`[CheckoutAbandonmentJob] Agendado com sucesso (Cron: ${cronSchedule})`);

    // Executa após 15 segundos no boot
    setTimeout(() => this.checkAbandonments(), 15000);

    cron.schedule(cronSchedule, () => {
      this.checkAbandonments();
    });
  }
}
