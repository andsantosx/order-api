import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';

export enum NotificationType {
  CART_ABANDONED = 'CART_ABANDONED',
  CHECKOUT_ABANDONED = 'CHECKOUT_ABANDONED',
  NEW_PRODUCT = 'NEW_PRODUCT',
  NEW_CATEGORY = 'NEW_CATEGORY',
  ADMIN_BROADCAST = 'ADMIN_BROADCAST',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column()
  title!: string;

  @Column('text')
  content!: string;

  @Column({
    type: 'varchar',
  })
  type!: NotificationType;

  @Index()
  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  @Column({ nullable: true })
  link?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
