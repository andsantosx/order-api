import cron from 'node-cron';
import { AppDataSource } from '../../data-source';
import { CartItem } from '../entities/CartItem';
import { Order } from '../entities/Order';
import { Notification, NotificationType } from '../entities/Notification';
import { User } from '../entities/User';
import { NotificationService } from '../services/NotificationService';
import { env } from '../../config/env';
import { log } from '../../config/logger';
import { LessThan, MoreThan, In } from 'typeorm';
import { container } from 'tsyringe';

export class CartAbandonmentJob {
  private static isRunning = false;
  private static notificationService = container.resolve(NotificationService);

  /**
   * Executa a busca e notificação de carrinhos abandonados.
   */
  public static async checkAbandonments(): Promise<void> {
    if (this.isRunning) {
      log.debug('[CartAbandonmentJob] Já existe uma execução em curso. Pulando...');
      return;
    }

    this.isRunning = true;
    log.info('[CartAbandonmentJob] Verificando carrinhos abandonados...');

    const cartRepository = AppDataSource.getRepository(CartItem);
    const orderRepository = AppDataSource.getRepository(Order);
    const notificationRepository = AppDataSource.getRepository(Notification);
    const userRepository = AppDataSource.getRepository(User);

    // Definição dos thresholds de tempo:
    // Abandonado há mais de env.CART_ABANDONMENT_HOURS horas (padrão: 2h) e menos de 24 horas
    const now = new Date();
    const abandonmentThreshold = new Date(now.getTime() - env.CART_ABANDONMENT_HOURS * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // 1. Encontra usuários que têm itens no carrinho atualizados no intervalo (2h a 24h atrás)
      const recentCartItems = await cartRepository.find({
        where: {
          updatedAt: LessThan(abandonmentThreshold),
        },
        select: ['userId', 'updatedAt'],
      });

      if (recentCartItems.length === 0) {
        log.info('[CartAbandonmentJob] Nenhum item de carrinho elegível encontrado.');
        return;
      }

      // Filtra usuários únicos
      const userIds = [...new Set(recentCartItems.map((item) => item.userId))];
      log.info(`[CartAbandonmentJob] Analisando abandono de carrinho para ${userIds.length} usuários.`);

      let count = 0;
      for (const userId of userIds) {
        try {
          // Encontra a data da última atualização do carrinho deste usuário
          const userCartItems = recentCartItems.filter((item) => item.userId === userId);
          const lastCartUpdate = new Date(
            Math.max(...userCartItems.map((item) => item.updatedAt.getTime())),
          );

          // Pula se for mais antigo que 24h
          if (lastCartUpdate < twentyFourHoursAgo) {
            continue;
          }

          // A. Verifica se o usuário criou algum pedido após a última atualização do carrinho
          const orderCreatedAfterCart = await orderRepository.findOne({
            where: {
              user: { id: userId },
              createdAt: MoreThan(lastCartUpdate),
            },
            select: ['id'],
          });

          if (orderCreatedAfterCart) {
            // Usuário finalizou ou iniciou outra compra depois de atualizar o carrinho, pula
            continue;
          }

          // B. Verifica se o usuário já recebeu uma notificação de CART_ABANDONED nas últimas 24 horas
          const recentNotification = await notificationRepository.findOne({
            where: {
              userId,
              type: NotificationType.CART_ABANDONED,
              createdAt: MoreThan(twentyFourHoursAgo),
            },
            select: ['id'],
          });

          if (recentNotification) {
            // Já notificado recentemente, pula para não spammar
            continue;
          }

          // Busca dados do usuário para personalização
          const user = await userRepository.findOne({
            where: { id: userId },
            select: ['id', 'name', 'email'],
          });

          if (!user) continue;

          // Enviar notificação e e-mail
          const checkoutUrl = `${env.FRONTEND_URL}/checkout`;
          await this.notificationService.createNotification(
            userId,
            'Você esqueceu itens no seu carrinho!',
            'Seus produtos favoritos estão esperando por você. Volte agora para finalizar sua compra antes que o estoque acabe!',
            NotificationType.CART_ABANDONED,
            '/checkout',
            true, // Enviar e-mail também
          );

          count++;
        } catch (error: unknown) {
          log.error(`[CartAbandonmentJob] Falha ao processar carrinho abandonado do usuário ${userId}:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      log.info(`[CartAbandonmentJob] Finalizado. ${count} usuários foram notificados por carrinho abandonado.`);
    } catch (error: unknown) {
      log.error('[CartAbandonmentJob] Erro inesperado na rotina de abandono de carrinho:', {
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

    log.info(`[CartAbandonmentJob] Agendado com sucesso (Cron: ${cronSchedule})`);

    // Executa após 10 segundos no boot
    setTimeout(() => this.checkAbandonments(), 10000);

    cron.schedule(cronSchedule, () => {
      this.checkAbandonments();
    });
  }
}
