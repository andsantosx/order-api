import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Category } from './Category';
import { ProductImage } from './ProductImage';
import { ProductSize } from './ProductSize';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({
    type: 'bigint', comment: 'Preço em centavos', transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10)
    }
  })
  price_cents!: number;

  @Column({ length: 3 })
  currency!: string;

  @ManyToOne(() => Category, category => category.products)
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @OneToMany(() => ProductImage, image => image.product, { cascade: true })
  images!: ProductImage[];

  @OneToMany(() => ProductSize, productSize => productSize.product, { cascade: true })
  sizes!: ProductSize[];
}
