import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Category } from './Category';
import { Brand } from './Brand';
import { ProductImage } from './ProductImage';
import { ProductSize } from './ProductSize';
import { Wishlist } from './Wishlist';
import { Money } from '../domain/value-objects/Money';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ length: 255 })
  name!: string;

  @Index()
  @Column({
    name: 'price_cents',
    type: 'bigint',
    comment: 'Preço em centavos',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  priceCents!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 3 })
  currency!: string;

  @Index()
  @Column({ name: 'is_featured', type: 'boolean', default: false })
  isFeatured!: boolean;

  @Column({ name: 'is_customizable', type: 'boolean', default: false })
  isCustomizable!: boolean;

  @ManyToOne(() => Category, (category) => category.products, { nullable: true, eager: true })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @ManyToOne(() => Brand, (brand) => brand.products, { nullable: true, eager: true })
  @JoinColumn({ name: 'brand_id' })
  brand!: Brand | null;

  @OneToMany(() => ProductImage, (image) => image.product, { cascade: true })
  images!: ProductImage[];

  @OneToMany(() => ProductSize, (productSize) => productSize.product, { cascade: true })
  sizes!: ProductSize[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.product)
  wishlist!: Wishlist[];

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /**
   * Domain Getter - Retorna o objeto Money para manipulação segura
   */
  get money(): Money {
    return new Money(this.priceCents);
  }
}
