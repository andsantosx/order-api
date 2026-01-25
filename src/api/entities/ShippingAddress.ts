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
    name!: string;

    @Column()
    street!: string;

    @Column()
    city!: string;

    @Column()
    state!: string;

    @Column()
    zip_code!: string;
}
