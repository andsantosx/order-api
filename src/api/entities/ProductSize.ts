import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product';
import { Size } from './Size';

@Entity('product_sizes')
export class ProductSize {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @ManyToOne(() => Product, product => product.sizes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product!: Product;

    @ManyToOne(() => Size)
    @JoinColumn({ name: 'size_id' })
    size!: Size;
}
