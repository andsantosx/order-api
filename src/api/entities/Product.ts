import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, DeleteDateColumn, CreateDateColumn } from 'typeorm';
import { Category } from './Category';
import { Brand } from './Brand';
import { ProductImage } from './ProductImage';
import { ProductSize } from './ProductSize';
import { Wishlist } from './Wishlist';

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

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 3 })
  currency!: string;

  @ManyToOne(() => Category, category => category.products, { nullable: true, eager: true })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @ManyToOne(() => Brand, brand => brand.products, { nullable: true, eager: true })
  @JoinColumn({ name: 'brand_id' })
  brand!: Brand | null;

  @OneToMany(() => ProductImage, image => image.product, { cascade: true })
  images!: ProductImage[];

  @OneToMany(() => ProductSize, productSize => productSize.product, { cascade: true })
  sizes!: ProductSize[];

  @OneToMany(() => Wishlist, wishlist => wishlist.product)
  wishlist!: Wishlist[];

  @DeleteDateColumn()
  deleted_at?: Date;

  @CreateDateColumn()
  created_at!: Date;
}
