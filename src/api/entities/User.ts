import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
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

  @Column({ name: 'password_hash', select: false })
  passwordHash!: string;

  @Column({ default: false })
  isAdmin!: boolean;

  @Column({ nullable: true, unique: true })
  document!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'accepted_terms', default: false })
  acceptedTerms!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.user)
  wishlist!: Wishlist[];

  @Column({ name: 'reset_password_code', nullable: true, select: false })
  resetPasswordCode?: string;

  @Column({ name: 'reset_password_expires_at', nullable: true, select: false })
  resetPasswordExpiresAt?: Date;

  /**
   * Método toJSON para sanitizar a saída automática da API.
   * Mascara dados sensíveis antes de enviar ao frontend.
   */
  toJSON() {
    const {
      passwordHash: _passwordHash,
      resetPasswordCode: _resetPasswordCode,
      resetPasswordExpiresAt: _resetPasswordExpiresAt,
      ...user
    } = this;
    return user;
  }
}
