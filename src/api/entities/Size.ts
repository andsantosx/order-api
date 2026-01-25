import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductVariant } from './ProductVariant';

@Entity('sizes')
export class Size {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column()
    name!: string;

    @Column()
    type!: string;

    @OneToMany(() => ProductVariant, variant => variant.size)
    variants!: ProductVariant[];
}
