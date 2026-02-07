import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from './Order';
import { Wishlist } from './Wishlist';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password_hash!: string;

  @Column({ default: false })
  isAdmin!: boolean;

  @Column({ nullable: true })
  document!: string;

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.user)
  wishlist!: Wishlist[];
}
