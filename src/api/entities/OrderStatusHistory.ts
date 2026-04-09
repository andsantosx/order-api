import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './Order';
import { Status } from './Status';
import { ChangedByRole } from '../../types/domain-enums';

/**
 * OrderStatusHistory
 *
 * Registra cada transição de status de um pedido.
 * Permite auditoria completa do ciclo de vida do pedido para admin e usuário.
 */
@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'from_status_id', nullable: true })
  fromStatusId?: number;

  @ManyToOne(() => Status, { nullable: true, eager: true })
  @JoinColumn({ name: 'from_status_id' })
  fromStatus?: Status;

  @Column({ name: 'to_status_id' })
  toStatusId!: number;

  @ManyToOne(() => Status, { eager: true })
  @JoinColumn({ name: 'to_status_id' })
  toStatus!: Status;

  /**
   * ID do usuário ou admin que realizou a mudança.
   * Null quando a mudança é automática (pagamento, webhook, sistema).
   */
  @Column({ name: 'changed_by_id', nullable: true })
  changedById?: string;

  /**
   * Papel de quem fez a mudança: USER | ADMIN | SYSTEM | PAYMENT_GATEWAY
   */
  @Column({
    name: 'changed_by_role',
    type: 'enum',
    enum: ChangedByRole,
    default: ChangedByRole.SYSTEM,
  })
  changedByRole!: ChangedByRole;

  /**
   * Notas opcionais do admin (ex: motivo do cancelamento)
   */
  @Column({ type: 'text', nullable: true })
  notes?: string;

  /**
   * Código de rastreio (preenchido na transição para SHIPPED)
   */
  @Column({ name: 'tracking_code', nullable: true })
  trackingCode?: string;

  /**
   * URL do site de rastreio
   */
  @Column({ name: 'tracking_url', nullable: true })
  trackingUrl?: string;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
