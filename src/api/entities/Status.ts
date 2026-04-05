import { Entity, PrimaryColumn, Column, OneToMany, Index } from 'typeorm';
import { Order } from './Order';
import { ContactMessage } from './ContactMessage';

@Entity('status')
@Index(['name', 'type'], { unique: true })
export class Status {
  @PrimaryColumn()
  id!: number;

  @Column()
  name!: string; // E.g., 'PENDING', 'PAID'

  @Column()
  label!: string; // E.g., 'Pendente', 'Pago'

  @Column()
  type!: string; // 'ORDER' or 'CONTACT'

  @OneToMany(() => Order, (order) => order.status)
  orders?: Order[];

  @OneToMany(() => ContactMessage, (message) => message.status)
  contactMessages?: ContactMessage[];
}
