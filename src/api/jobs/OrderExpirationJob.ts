import cron from 'node-cron';
import { AppDataSource } from '../../data-source';
import { Order, OrderStatus } from '../entities/Order';
import { ChangedByRole } from '../../types/domain-enums';
import { OrderService } from '../services/OrderService';
import { env } from '../../config/env';
import { log } from '../../config/logger';
import { LessThan, In } from 'typeorm';

/**
 * OrderExpirationJob
 * 
 * Rotina automática responsável por cancelar pedidos que ficaram pendentes ou em processamento
 * por muito tempo (expiração de Pix ou pedidos abandonados).
 * 
 * Implementação utilizando node-cron, seguindo padrões de mercado para 
 * sistemas de e-commerce resilientes.
 */
export class OrderExpirationJob {
  private static isRunning = false;
  private static orderService = new OrderService();

  /**
   * Executa a lógica de cancelamento de pedidos expirados.
   * Filtra pedidos por status (Pendente/Processando) e data de criação.
   */
  public static async checkExpirations(): Promise<void> {
    if (this.isRunning) {
      log.debug('[OrderExpirationJob] Já existe uma execução em curso. Pulando esta rodada...');
      return;
    }

    this.isRunning = true;
    log.info('[OrderExpirationJob] Verificando pedidos expirados (Threshold: ' + env.ORDER_EXPIRATION_HOURS + 'h)...');

    const orderRepository = AppDataSource.getRepository(Order);
    const expirationThreshold = new Date();
    expirationThreshold.setHours(expirationThreshold.getHours() - env.ORDER_EXPIRATION_HOURS);

    try {
      // 1. Busca pedidos que estão em status PENDING (1) ou PROCESSING (2) e têm data anterior ao threshold
      const expiredOrders = await orderRepository.find({
        where: {
          statusId: In([OrderStatus.PENDING, OrderStatus.PROCESSING]),
          createdAt: LessThan(expirationThreshold),
        },
        select: ['id', 'statusId', 'createdAt'],
      });

      if (expiredOrders.length === 0) {
        log.info('[OrderExpirationJob] Nenhum pedido expirado para processar.');
        return;
      }

      log.info(`[OrderExpirationJob] Processando expiração para ${expiredOrders.length} pedidos...`);

      // 2. Processamento individual para garantir auditoria e disparar notificações (WebSockets/Emails)
      let count = 0;
      for (const order of expiredOrders) {
        try {
          await this.orderService.updateStatus(
            order.id,
            {
              status: OrderStatus.CANCELLED,
              changedByRole: ChangedByRole.SYSTEM,
              changedById: 'SYSTEM_AUTOMATION',
              notes: `Cancelamento automático do sistema: pedido pendente/pix expirado (há mais de ${env.ORDER_EXPIRATION_HOURS}h).`,
            },
            true // requesterIsAdmin: permite que o sistema altere o status ignorando travas de permissão de usuário
          );
          count++;
        } catch (error: any) {
          log.error(`[OrderExpirationJob] Falha ao expirar pedido ${order.id}:`, { error: error.message });
        }
      }

      log.info(`[OrderExpirationJob] Finalizado. ${count} pedidos foram cancelados agora.`);
    } catch (error: any) {
      log.error('[OrderExpirationJob] Erro inesperado na rotina de expiração:', { error: error.message });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Inicializa o agendamento da rotina via Cron.
   * Por padrão, roda a cada 30 minutos.
   */
  public static init(): void {
    const cronSchedule = env.ORDER_EXPIRATION_CRON; 

    log.info(`[OrderExpirationJob] Agendado com sucesso (Cron: ${cronSchedule}) | Expiração: ${env.ORDER_EXPIRATION_HOURS}h.`);

    // Executa uma vez no boot do sistema (com delay leve para garantir DB pronto)
    setTimeout(() => this.checkExpirations(), 5000);

    // Agenda via node-cron
    cron.schedule(cronSchedule, () => {
      this.checkExpirations();
    });
  }
}
