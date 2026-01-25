import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product';

@Entity('product_images')
export class ProductImage {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @ManyToOne(() => Product, product => product.images, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product!: Product;

    @Column()
    url!: string;
}
