import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';

@Entity('shipping_addresses')
export class ShippingAddress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ length: 255 })
  street!: string;

  @Column({ length: 100 })
  city!: string;

  @Column({ length: 2 })
  state!: string;

  @Column({ length: 10 })
  zip_code!: string;

  @Column({ length: 60, default: 'Brasil' })
  country!: string;
}
