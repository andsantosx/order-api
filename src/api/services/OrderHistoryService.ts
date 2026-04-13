import { AppDataSource } from '../../data-source';
import { OrderStatusHistory } from '../entities/OrderStatusHistory';
import { Order } from '../entities/Order';
import { ChangedByRole } from '../../types/domain-enums';
import { log } from '../../config/logger';

export interface RecordStatusChangeOptions {
  order: Order;
  toStatusId: number;
  changedById?: string;
  changedByRole: ChangedByRole;
  notes?: string;
  trackingCode?: string;
  trackingUrl?: string;
}

/**
 * OrderHistoryService
 *
 * Centraliza o registro do histórico de mudanças de status de pedidos.
 * Garante rastreabilidade completa do ciclo de vida para admin e usuário.
 *
 * Padrão: fire-and-forget — erros no log não derrubam o fluxo principal.
 */
export class OrderHistoryService {
  private static repository = AppDataSource.getRepository(OrderStatusHistory);

  /**
   * Registra uma mudança de status no histórico.
   */
  public static async record(options: RecordStatusChangeOptions): Promise<void> {
    try {
      const entry = this.repository.create({
        orderId: options.order.id,
        fromStatusId: options.order.statusId || undefined,
        toStatusId: options.toStatusId,
        changedById: options.changedById,
        changedByRole: options.changedByRole,
        notes: options.notes,
        trackingCode: options.trackingCode,
        trackingUrl: options.trackingUrl,
      });

      await this.repository.save(entry);

      log.info('[OrderHistory] Status change recorded', {
        orderId: options.order.id,
        from: options.order.statusId,
        to: options.toStatusId,
        by: options.changedByRole,
      });
    } catch (error) {
      // Falha no histórico não deve derrubar o fluxo principal
      log.error('[OrderHistory] Failed to record status change', {
        error,
        orderId: options.order.id,
      });
    }
  }

  /**
   * Retorna o histórico completo de status de um pedido,
   * ordenado do mais antigo ao mais recente.
   */
  public static async getByOrderId(orderId: string): Promise<OrderStatusHistory[]> {
    return this.repository.find({
      where: { orderId },
      order: { createdAt: 'ASC' },
    });
  }
}
