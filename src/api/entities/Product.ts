import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

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

  @Column('integer')
  stock!: number;
}
