import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Product } from './Product';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @OneToMany(() => Product, (product) => product.brand)
  products!: Product[];
}
