import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';

@Entity('shipping_addresses')
export class ShippingAddress {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ length: 255, nullable: true })
  street!: string;

  @Column({ length: 100, nullable: true })
  city!: string;

  @Column({ length: 2, nullable: true })
  state!: string;

  @Column({ name: 'zip_code', length: 10, nullable: true })
  zipCode!: string;

  @Column({ length: 60, default: 'Brasil', nullable: true })
  country!: string;
}
