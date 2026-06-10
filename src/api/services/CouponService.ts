import { AppDataSource } from '../../data-source';
import { Coupon } from '../entities/Coupon';
import { CouponUserUsage } from '../entities/CouponUserUsage';
import { Order, OrderStatus } from '../entities/Order';
import { AppError } from '../middlewares/errorHandler';
import { log } from '../../config/logger';
import { HTTP_STATUS } from '../../constants';
import { injectable } from 'tsyringe';
import { Not } from 'typeorm';

@injectable()
export class CouponService {
  private couponRepository = AppDataSource.getRepository(Coupon);
  private usageRepository = AppDataSource.getRepository(CouponUserUsage);

  async getAll() {
    log.info('Buscando todos os cupons');
    return this.couponRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getOne(id: string) {
    const coupon = await this.couponRepository.findOneBy({ id });
    if (!coupon) {
      log.warn('Cupom não encontrado', { couponId: id });
      throw new AppError('Cupom não encontrado', HTTP_STATUS.NOT_FOUND);
    }
    return coupon;
  }

  async create(
    code: string,
    discountPercentage: number,
    maxUsesPerUser: number,
    maxUsesGlobal?: number | null,
    minOrderValueCents?: number | null,
    maxDiscountCents?: number | null,
    firstOrderOnly?: boolean,
    minItems?: number,
    isActive?: boolean,
    expiresAt?: Date | null,
  ) {
    const uppercaseCode = code.toUpperCase().trim();

    // Verificar se já existe
    const existing = await this.couponRepository.findOneBy({ code: uppercaseCode });
    if (existing) {
      log.warn('Tentativa de criar cupom duplicado', { code: uppercaseCode });
      throw new AppError('Já existe um cupom cadastrado com este código', HTTP_STATUS.BAD_REQUEST);
    }

    const coupon = this.couponRepository.create({
      code: uppercaseCode,
      discountPercentage,
      maxUsesPerUser,
      maxUsesGlobal: maxUsesGlobal ?? null,
      minOrderValueCents: minOrderValueCents ?? null,
      maxDiscountCents: maxDiscountCents ?? null,
      firstOrderOnly: firstOrderOnly ?? false,
      minItems: minItems ?? 1,
      isActive: isActive ?? true,
      expiresAt: expiresAt ?? null,
      usedCount: 0,
    });

    const saved = await this.couponRepository.save(coupon);
    log.info('Novo cupom criado', { couponId: saved.id, code: saved.code });
    return saved;
  }

  async update(
    id: string,
    data: {
      code?: string;
      discountPercentage?: number;
      maxUsesPerUser?: number;
      maxUsesGlobal?: number | null;
      minOrderValueCents?: number | null;
      maxDiscountCents?: number | null;
      firstOrderOnly?: boolean;
      minItems?: number;
      isActive?: boolean;
      expiresAt?: Date | null;
    },
  ) {
    const coupon = await this.couponRepository.findOneBy({ id });
    if (!coupon) {
      log.warn('Tentativa de atualizar cupom inexistente', { couponId: id });
      throw new AppError('Cupom não encontrado', HTTP_STATUS.NOT_FOUND);
    }

    if (data.code) {
      const uppercaseCode = data.code.toUpperCase().trim();
      if (uppercaseCode !== coupon.code) {
        const existing = await this.couponRepository.findOneBy({ code: uppercaseCode });
        if (existing) {
          log.warn('Tentativa de atualizar cupom com código duplicado', { code: uppercaseCode });
          throw new AppError('Já existe outro cupom cadastrado com este código', HTTP_STATUS.BAD_REQUEST);
        }
        coupon.code = uppercaseCode;
      }
    }

    if (data.discountPercentage !== undefined) {
      coupon.discountPercentage = data.discountPercentage;
    }

    if (data.maxUsesPerUser !== undefined) {
      if (data.maxUsesPerUser < 1) {
        throw new AppError(
          'A quantidade máxima de usos por usuário deve ser pelo menos 1',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      coupon.maxUsesPerUser = data.maxUsesPerUser;
    }

    if (data.maxUsesGlobal !== undefined) {
      if (data.maxUsesGlobal !== null && data.maxUsesGlobal < 1) {
        throw new AppError(
          'A quantidade máxima de usos globais deve ser pelo menos 1',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      coupon.maxUsesGlobal = data.maxUsesGlobal;
    }

    if (data.minOrderValueCents !== undefined) {
      if (data.minOrderValueCents !== null && data.minOrderValueCents < 0) {
        throw new AppError(
          'O valor mínimo do pedido deve ser maior ou igual a zero',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      coupon.minOrderValueCents = data.minOrderValueCents;
    }

    if (data.maxDiscountCents !== undefined) {
      if (data.maxDiscountCents !== null && data.maxDiscountCents < 0) {
        throw new AppError(
          'O desconto máximo deve ser maior ou igual a zero',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      coupon.maxDiscountCents = data.maxDiscountCents;
    }

    if (data.firstOrderOnly !== undefined) {
      coupon.firstOrderOnly = data.firstOrderOnly;
    }

    if (data.minItems !== undefined) {
      if (data.minItems < 1) {
        throw new AppError(
          'A quantidade mínima de itens deve ser pelo menos 1',
          HTTP_STATUS.BAD_REQUEST,
        );
      }
      coupon.minItems = data.minItems;
    }

    if (data.isActive !== undefined) {
      coupon.isActive = data.isActive;
    }

    if (data.expiresAt !== undefined) {
      coupon.expiresAt = data.expiresAt;
    }

    const updated = await this.couponRepository.save(coupon);
    log.info('Cupom atualizado', { couponId: id, code: updated.code });
    return updated;
  }

  async delete(id: string) {
    const coupon = await this.couponRepository.findOneBy({ id });
    if (!coupon) {
      log.warn('Tentativa de deletar cupom inexistente', { couponId: id });
      throw new AppError('Cupom não encontrado', HTTP_STATUS.NOT_FOUND);
    }

    await this.couponRepository.remove(coupon);
    log.info('Cupom removido', { couponId: id, code: coupon.code });
    return { message: 'Cupom removido com sucesso' };
  }

  /**
   * Valida um cupom para aplicação no carrinho.
   *
   * @param code - Código do cupom
   * @param itemCount - Quantidade de itens no carrinho
   * @param userId - ID do usuário logado (opcional para guests)
   * @param subtotalCents - Valor do carrinho antes de frete/personalizações (opcional para validação preliminar)
   */
  async validate(code: string, itemCount: number, userId?: string, subtotalCents?: number) {
    const uppercaseCode = code.toUpperCase().trim();
    const coupon = await this.couponRepository.findOneBy({ code: uppercaseCode });

    if (!coupon) {
      log.warn('Tentativa de validação de cupom inexistente', { code: uppercaseCode });
      throw new AppError('Cupom inválido ou não encontrado', HTTP_STATUS.NOT_FOUND);
    }

    // Regra de negócios: cupom deve estar ativo
    if (coupon.isActive === false) {
      log.warn('Validação de cupom negada: cupom inativo', { code: uppercaseCode });
      throw new AppError('Este cupom está temporariamente inativo', HTTP_STATUS.BAD_REQUEST);
    }

    // Regra de negócios: cupom não deve estar expirado
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      log.warn('Validação de cupom negada: cupom expirado', {
        code: uppercaseCode,
        expiresAt: coupon.expiresAt,
      });
      throw new AppError('Este cupom já expirou e não é mais válido', HTTP_STATUS.BAD_REQUEST);
    }

    // Regra de negócios: limite global de usos
    if (coupon.maxUsesGlobal !== null && coupon.maxUsesGlobal !== undefined && coupon.usedCount >= coupon.maxUsesGlobal) {
      log.warn('Validação de cupom negada: limite global atingido', {
        code: uppercaseCode,
        usedCount: coupon.usedCount,
        maxUsesGlobal: coupon.maxUsesGlobal,
      });
      throw new AppError('Este cupom atingiu o limite máximo de usos permitido', HTTP_STATUS.BAD_REQUEST);
    }

    // Regra de negócios: mínimo de itens configurado pelo admin no cupom
    if (itemCount < coupon.minItems) {
      log.warn('Validação de cupom negada: itens insuficientes', {
        code: uppercaseCode,
        itemCount,
        minItems: coupon.minItems,
      });
      throw new AppError(
        `Este cupom só é válido para compras com ${coupon.minItems} ou mais itens`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Regra de negócios: subtotal mínimo do pedido
    if (coupon.minOrderValueCents !== null && coupon.minOrderValueCents !== undefined && subtotalCents !== undefined && subtotalCents < coupon.minOrderValueCents) {
      log.warn('Validação de cupom negada: valor mínimo não atingido', {
        code: uppercaseCode,
        subtotalCents,
        minOrderValueCents: coupon.minOrderValueCents,
      });
      const minValFormatted = (coupon.minOrderValueCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      throw new AppError(
        `Este cupom só é válido para compras acima de ${minValFormatted}`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    // Regra de negócios: exclusivo para primeira compra
    if (coupon.firstOrderOnly && userId) {
      const orderRepository = AppDataSource.getRepository(Order);
      const existingOrder = await orderRepository.findOne({
        where: {
          user: { id: userId },
          statusId: Not(OrderStatus.CANCELLED),
        },
      });
      if (existingOrder) {
        log.warn('Validação de cupom negada: exclusivo para primeira compra', {
          code: uppercaseCode,
          userId,
        });
        throw new AppError('Este cupom é exclusivo para a primeira compra', HTTP_STATUS.BAD_REQUEST);
      }
    }

    // Verificação de uso por usuário (quando logado)
    if (userId) {
      const usage = await this.usageRepository.findOne({
        where: { couponId: coupon.id, userId },
      });

      const currentUseCount = usage?.useCount ?? 0;

      if (currentUseCount >= coupon.maxUsesPerUser) {
        log.warn('Validação negada: usuário atingiu limite de uso do cupom', {
          code: uppercaseCode,
          userId,
          currentUseCount,
          maxUsesPerUser: coupon.maxUsesPerUser,
        });
        throw new AppError(
          `Você já utilizou este cupom o número máximo de vezes permitido (${coupon.maxUsesPerUser}x)`,
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const usesLeft = coupon.maxUsesPerUser - currentUseCount;
      log.info('Cupom validado com sucesso (usuário logado)', {
        code: uppercaseCode,
        userId,
        usesLeft,
        discountPercentage: coupon.discountPercentage,
      });

      return {
        id: coupon.id,
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        minItems: coupon.minItems,
        usesLeft,
      };
    }

    // Guest: validação básica (o limite por usuário será verificado no checkout)
    log.info('Cupom validado com sucesso (guest)', { code: uppercaseCode, discountPercentage: coupon.discountPercentage });
    return {
      id: coupon.id,
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
      minItems: coupon.minItems,
      usesLeft: null, // Guests não têm controle de uso individual nesta etapa
    };
  }
}
