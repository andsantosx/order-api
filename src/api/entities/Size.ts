import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductVariant } from './ProductVariant';

@Entity('sizes')
export class Size {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column()
    type!: string;

    @OneToMany(() => ProductVariant, variant => variant.size)
    variants!: ProductVariant[];
}
