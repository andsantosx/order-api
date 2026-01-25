import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Category } from './Category';
import { Size } from './Size';
import { ProductImage } from './ProductImage';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'bigint', comment: 'Preço em centavos' })
  price_cents!: number;

  @Column({ length: 3 })
  currency!: string;

  @ManyToOne(() => Category, category => category.products)
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @ManyToOne(() => Size)
  @JoinColumn({ name: 'size_id' })
  size!: Size;

  @OneToMany(() => ProductImage, image => image.product, { cascade: true })
  images!: ProductImage[];
}
