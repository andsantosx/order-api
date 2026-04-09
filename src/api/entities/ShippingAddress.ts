import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';

@Entity('shipping_addresses')
export class ShippingAddress {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order!: Order;

    @Column()
    street!: string;

    @Column()
    city!: string;

    @Column()
    state!: string;

    @Column({ default: 'Brasil' })
    country!: string;

    @Column({ name: 'zip_code' })
    zipCode!: string;
}
