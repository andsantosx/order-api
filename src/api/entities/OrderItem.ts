import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column('integer')
  quantity!: number;

  @Column({ nullable: true })
  size?: string;

  @Column({
    name: 'unit_price',
    type: 'bigint',
    comment: 'Preço unitário no momento da compra',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  unitPrice!: number;

  @Column({
    name: 'total_price',
    type: 'bigint',
    comment: 'Preço total (quantidade * preço unitário)',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  totalPrice!: number;
}
