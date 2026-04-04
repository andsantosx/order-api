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

  @Column({ select: false })
  password_hash!: string;

  @Column({ default: false })
  isAdmin!: boolean;

  @Column({ nullable: true, unique: true })
  document!: string;

  @Column({ default: false })
  accepted_terms!: boolean;

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @OneToMany(() => Wishlist, (wishlist) => wishlist.user)
  wishlist!: Wishlist[];

  /**
   * Método toJSON para sanitizar a saída automática da API.
   * Mascara dados sensíveis antes de enviar ao frontend.
   */
  toJSON() {
    const { password_hash, ...user } = this;

    // Máscara de CPF: mantém apenas os últimos 3 dígitos visíveis
    if (user.document && user.document.length >= 11) {
      const doc = user.document.replace(/\D/g, '');
      user.document = `***.***.***-${doc.slice(-2)}`;
    }

    return user;
  }
}
