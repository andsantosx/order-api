import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ContactMessageStatus {
  PENDING = 'pending',
  REPLIED = 'replied',
  CLOSED = 'closed',
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

  @Column({
    type: 'enum',
    enum: ContactMessageStatus,
    default: ContactMessageStatus.PENDING,
  })
  status!: ContactMessageStatus;

  @CreateDateColumn()
  created_at!: Date;
}
