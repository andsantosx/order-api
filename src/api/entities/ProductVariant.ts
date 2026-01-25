import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product';
import { Size } from './Size';

@Entity('product_variants')
export class ProductVariant {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @ManyToOne(() => Product, product => product.variants, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product!: Product;

    @ManyToOne(() => Size, size => size.variants)
    @JoinColumn({ name: 'size_id' })
    size!: Size;

    @Column()
    color!: string;

    @Column('integer')
    stock!: number;

    @Column({ type: 'bigint', nullable: true })
    price_cents?: number;
}
