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
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELED = 'CANCELED',
  REFUNDED = 'REFUNDED',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ nullable: true })
  guest_email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Index()
  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  total_amount!: number;

  @Column({ length: 3 })
  currency!: string;

  @Column({ type: 'uuid', unique: true })
  idempotency_key!: string;

  @Column({ nullable: true })
  payment_id?: string; // Stores Mercado Pago Transaction ID

  @Column({ nullable: true })
  payment_method?: string; // pix, credit_card, ticket, etc.

  @Column({ default: 1 })
  installments!: number;

  @Column({ nullable: true })
  card_last_four?: string;

  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Index()
  @CreateDateColumn()
  created_at!: Date;

  @Column({ default: false })
  accepted_terms!: boolean;

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
      [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELED],
      [OrderStatus.PAID]: [OrderStatus.SHIPPED, OrderStatus.REFUNDED, OrderStatus.CANCELED],
      [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED, OrderStatus.CANCELED],
      [OrderStatus.DELIVERED]: [OrderStatus.REFUNDED],
      [OrderStatus.CANCELED]: [], // Terminal
      [OrderStatus.REFUNDED]: [], // Terminal
    };

    return validTransitions[this.status].includes(newStatus);
  }

  /**
   * Sanitiza a saída do pedido para evitar vazamento de chaves internas.
   */
  toJSON() {
    const { idempotency_key, payment_id, ...order } = this;
    return {
      ...order,
      payment_id: payment_id ? `****${payment_id.slice(-4)}` : undefined,
    };
  }

  /**
   * Domain Getter - Retorna o objeto Money
   */
  get money(): Money {
    return new Money(this.total_amount);
  }
}
