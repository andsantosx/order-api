import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Entidade para armazenar logs de auditoria de ações administrativas.
 * Essencial para rastreabilidade e segurança em fluxos críticos.
 */
@Entity('admin_audit_logs')
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column()
  adminId!: string; // ID do administrador que realizou a ação

  @Column()
  adminEmail!: string;

  @Index()
  @Column()
  action!: string; // Ex: UPDATE_ORDER_STATUS, DELETE_PRODUCT, etc.

  @Column()
  method!: string; // POST, PUT, DELETE

  @Column()
  path!: string; // Endpoint acessado

  @Column({ type: 'text', nullable: true })
  resourceId?: string; // ID do recurso afetado (Pedido, Produto, etc)

  @Column({ type: 'json', nullable: true })
  payload?: Record<string, unknown>; // Dados enviados no request (filtrados)

  @Column({ type: 'json', nullable: true })
  prevValues?: Record<string, unknown>; // Valores anteriores (se aplicável e capturado)

  @Column()
  ip!: string;

  @Column()
  userAgent!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
