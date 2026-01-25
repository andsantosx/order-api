import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Category } from './Category';
import { ProductVariant } from './ProductVariant';
import { ProductImage } from './ProductImage';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'bigint', comment: 'Preço em centavos para evitar problemas com ponto flutuante' })
  price_cents!: number;

  @Column({ length: 3 })
  currency!: string;

  @ManyToOne(() => Category, category => category.products)
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @OneToMany(() => ProductVariant, variant => variant.product, { cascade: true })
  variants!: ProductVariant[];

  @OneToMany(() => ProductImage, image => image.product, { cascade: true })
  images!: ProductImage[];
}
