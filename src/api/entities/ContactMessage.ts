import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Status } from './Status';

export enum ContactMessageStatus {
  PENDING = 101,
  REPLIED = 102,
  CLOSED = 103,
}

@Entity('contact_messages')
export class ContactMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column()
  subject!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text', nullable: true })
  response?: string;

  @Column({ name: 'status_id' })
  statusId!: number;

  @ManyToOne(() => Status, (status) => status.contactMessages)
  @JoinColumn({ name: 'status_id' })
  status!: Status;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
