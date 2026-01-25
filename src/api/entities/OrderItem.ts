import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';
import { ProductVariant } from './ProductVariant';

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

  @ManyToOne(() => ProductVariant, { nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant?: ProductVariant;

  @Column('integer')
  quantity!: number;

  @Column({ type: 'bigint', comment: 'Preço unitário do produto no momento da compra, em centavos' })
  unit_price!: number;

  @Column({ type: 'bigint', comment: 'Preço total para este item (quantidade * preço unitário), em centavos' })
  total_price!: number;
}
