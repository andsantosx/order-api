import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' }) // Mapeia para a coluna 'order_id'
  order!: Order;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' }) // Mapeia para a coluna 'product_id'
  product!: Product;

  @Column('integer')
  quantity!: number;

  @Column({ type: 'bigint', comment: 'Preço unitário do produto no momento da compra, em centavos' })
  unit_price!: number;

  @Column({ type: 'bigint', comment: 'Preço total para este item (quantidade * preço unitário), em centavos' })
  total_price!: number;
}
