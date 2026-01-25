import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './User';
import { OrderItem } from './OrderItem';
import { ShippingAddress } from './ShippingAddress';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, user => user.orders, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ nullable: true })
  guest_email?: string;

  @Column({
    type: 'bigint', transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10)
    }
  })
  total_amount!: number;

  @Column({ length: 3 })
  currency!: string;

  @Column({ type: 'uuid', unique: true })
  idempotency_key!: string;

  @Column({ default: 'PENDING' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => OrderItem, item => item.order, { cascade: true })
  items!: OrderItem[];

  @OneToMany(() => ShippingAddress, address => address.order, { cascade: true })
  shippingAddress!: ShippingAddress[];
}
