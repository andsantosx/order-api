import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Order } from './Order';

@Entity('stripe_checkout_sessions')
export class StripeCheckoutSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ unique: true })
  stripe_intent_id: string;

  @Column()
  client_secret: string;

  @Column()
  status: string;

  @Column({ type: 'bigint' })
  amount_cents: number;

  @CreateDateColumn()
  created_at: Date;
}
