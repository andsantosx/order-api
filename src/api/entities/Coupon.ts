import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ name: 'discount_percentage', type: 'integer' })
  discountPercentage!: number;

  @Column({ name: 'max_uses_per_user', type: 'integer' })
  maxUsesPerUser!: number;

  @Column({ name: 'max_uses_global', type: 'integer', nullable: true })
  maxUsesGlobal?: number | null;

  @Column({ name: 'min_order_value_cents', type: 'integer', nullable: true })
  minOrderValueCents?: number | null;

  @Column({ name: 'max_discount_cents', type: 'integer', nullable: true })
  maxDiscountCents?: number | null;

  @Column({ name: 'first_order_only', type: 'boolean', default: false })
  firstOrderOnly!: boolean;

  /**
   * Quantidade mínima de itens no carrinho para o cupom ser válido.
   * Configurada pelo admin ao criar/editar o cupom.
   * Padrão: 1.
   */
  @Column({ name: 'min_items', type: 'integer', default: 1 })
  minItems!: number;

  @Column({ name: 'used_count', type: 'integer', default: 0 })
  usedCount!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
