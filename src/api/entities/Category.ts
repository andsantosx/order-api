import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from './Product';

@Entity('categories')
export class Category {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column()
    name!: string;

    @Column({ unique: true })
    slug!: string;

    @OneToMany(() => Product, product => product.category)
    products!: Product[];
}
