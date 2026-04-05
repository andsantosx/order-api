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

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

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
  paymentId?: string; // Stores Mercado Pago Transaction ID

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod?: string; // pix, credit_card, ticket, etc.

  @Column({ default: 1 })
  installments!: number;

  @Column({ name: 'card_last_four', nullable: true })
  cardLastFour?: string;

  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'accepted_terms', default: false })
  acceptedTerms!: boolean;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @OneToMany(() => ShippingAddress, (address) => address.order, { cascade: true })
  shippingAddress!: ShippingAddress[];

  /**
   * Verifica se a transição para um novo status é permitida.
   * Centraliza a lógica da Máquina de Estados do pedido.
   */
  canTransitionTo(newStatus: OrderStatus): boolean {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.REFUNDED, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELLED]: [], // Terminal
      [OrderStatus.REFUNDED]: [], // Terminal
    };

    return validTransitions[this.status].includes(newStatus);
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
