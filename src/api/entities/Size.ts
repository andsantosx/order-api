import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from './Product';

@Entity('sizes')
export class Size {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column()
    name!: string;

    @Column()
    type!: string;

    @OneToMany(() => Product, product => product.size)
    products!: Product[];
}
