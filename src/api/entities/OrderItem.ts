import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column('integer')
  quantity!: number;

  @Column({ type: 'bigint', comment: 'Preço unitário no momento da compra' })
  unit_price!: number;

  @Column({ type: 'bigint', comment: 'Preço total (quantidade * preço unitário)' })
  total_price!: number;
}
