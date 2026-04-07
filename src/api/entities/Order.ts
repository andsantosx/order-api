import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { OrderItem } from './OrderItem';
import { ShippingAddress } from './ShippingAddress';
import { Money } from '../domain/value-objects/Money';
import { Status } from './Status';
import { OrderStatusHistory } from './OrderStatusHistory';
import { OrderDomainEvent } from '../../types/domain-enums';

export enum OrderStatus {
  PENDING = 1,           // Pedido criado, aguardando pagamento
  PROCESSING = 2,        // Pagamento em análise (PIX, boleto)
  PAID = 3,              // Pagamento aprovado/confirmado
  SHIPPED = 4,           // Enviado ao transportador
  DELIVERED = 5,         // Entrega confirmada
  CANCELLED = 6,         // Cancelado
  REFUNDED = 7,          // Reembolsado
  AWAITING_SHIPMENT = 8, // Pago, preparando envio (separação em estoque)
}

/**
 * Mapeamento de status do pedido → evento de domínio correspondente.
 * Usado por services para disparar o evento correto após cada transição.
 */
export const ORDER_STATUS_EVENTS: Record<number, OrderDomainEvent> = {
  [OrderStatus.PENDING]:           OrderDomainEvent.ORDER_CREATED,
  [OrderStatus.PROCESSING]:        OrderDomainEvent.PAYMENT_PENDING,
  [OrderStatus.PAID]:              OrderDomainEvent.PAYMENT_APPROVED,
  [OrderStatus.AWAITING_SHIPMENT]: OrderDomainEvent.ORDER_AWAITING_SHIPMENT,
  [OrderStatus.SHIPPED]:           OrderDomainEvent.ORDER_SHIPPED,
  [OrderStatus.DELIVERED]:         OrderDomainEvent.ORDER_DELIVERED,
  [OrderStatus.CANCELLED]:         OrderDomainEvent.ORDER_CANCELLED,
  [OrderStatus.REFUNDED]:          OrderDomainEvent.ORDER_REFUNDED,
};

/**
 * Máquina de estados: define quais transições são permitidas por papel
 */
export const VALID_TRANSITIONS: Record<number, number[]> = {
  [OrderStatus.PENDING]:           [OrderStatus.PROCESSING, OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]:        [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]:              [OrderStatus.AWAITING_SHIPMENT, OrderStatus.SHIPPED, OrderStatus.REFUNDED],
  [OrderStatus.AWAITING_SHIPMENT]: [OrderStatus.SHIPPED],
  [OrderStatus.SHIPPED]:           [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  [OrderStatus.DELIVERED]:         [OrderStatus.REFUNDED],
  [OrderStatus.CANCELLED]:         [], // Terminal
  [OrderStatus.REFUNDED]:          [], // Terminal
};

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'guest_email', nullable: true })
  guestEmail?: string;

  @Column({ nullable: true })
  phone?: string;

  @Index()
  @Column({
    name: 'total_amount',
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  totalAmount!: number;

  @Column({ length: 3 })
  currency!: string;

  @Column({ name: 'idempotency_key', type: 'uuid', unique: true })
  idempotencyKey!: string;

  @Column({ name: 'payment_id', nullable: true })
  paymentId?: string; // ID da transação no Mercado Pago

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod?: string; // pix, credit_card, ticket, etc.

  @Column({ default: 1 })
  installments!: number;

  @Column({ name: 'card_last_four', nullable: true })
  cardLastFour?: string;

  @Index()
  @Column({ name: 'status_id' })
  statusId!: number;

  @ManyToOne(() => Status, (status) => status.orders)
  @JoinColumn({ name: 'status_id' })
  status!: Status;

  // Código de rastreio do transportador
  @Column({ name: 'tracking_code', nullable: true })
  trackingCode?: string;

  // URL do portal de rastreio
  @Column({ name: 'tracking_url', nullable: true })
  trackingUrl?: string;

  // Timestamps de ciclo de vida
  @Column({ name: 'shipped_at', nullable: true })
  shippedAt?: Date;

  @Column({ name: 'delivered_at', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt?: Date;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'accepted_terms', default: false })
  acceptedTerms!: boolean;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @OneToMany(() => ShippingAddress, (address) => address.order, { cascade: true })
  shippingAddress!: ShippingAddress[];

  @OneToMany(() => OrderStatusHistory, (history) => history.order)
  statusHistory!: OrderStatusHistory[];

  /**
   * Verifica se a transição para um novo status é permitida.
   * Centraliza a lógica da Máquina de Estados do pedido.
   */
  canTransitionTo(newStatusId: number): boolean {
    return VALID_TRANSITIONS[this.statusId]?.includes(newStatusId) ?? false;
  }

  /**
   * Sanitiza a saída do pedido para evitar vazamento de chaves internas.
   */
  toJSON() {
    const { idempotencyKey, paymentId, ...order } = this;
    return {
      ...order,
      paymentId: paymentId ? `****${paymentId.slice(-4)}` : undefined,
    };
  }

  /**
   * Domain Getter - Retorna o objeto Money
   */
  get money(): Money {
    return new Money(this.totalAmount);
  }
}
