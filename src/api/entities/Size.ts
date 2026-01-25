import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductSize } from './ProductSize';

@Entity('sizes')
export class Size {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column()
    name!: string;

    @Column()
    type!: string;

    @OneToMany(() => ProductSize, productSize => productSize.size)
    productSizes!: ProductSize[];
}
