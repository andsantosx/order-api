import { Request, Response, NextFunction } from 'express';
import { CouponService } from '../services/CouponService';
import { injectable, inject } from 'tsyringe';

@injectable()
export class CouponController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const coupons = await this.couponService.getAll();
      res.json(coupons);
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const coupon = await this.couponService.getOne(id);
      res.json(coupon);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        code,
        discountPercentage,
        maxUsesPerUser,
        maxUsesGlobal,
        minOrderValueCents,
        maxDiscountCents,
        firstOrderOnly,
        minItems,
        isActive,
        expiresAt,
      } = req.body;
      const coupon = await this.couponService.create(
        code,
        discountPercentage,
        maxUsesPerUser,
        maxUsesGlobal,
        minOrderValueCents,
        maxDiscountCents,
        firstOrderOnly,
        minItems,
        isActive,
        expiresAt,
      );
      res.status(201).json(coupon);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const coupon = await this.couponService.update(id, req.body);
      res.json(coupon);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await this.couponService.delete(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const code = req.query.code as string;
      const itemCount = parseInt(req.query.itemCount as string, 10);
      const subtotalCents = req.query.subtotalCents
        ? parseInt(req.query.subtotalCents as string, 10)
        : undefined;
      // userId é extraído pelo optionalAuthMiddleware — undefined para guests
      const userId = req.user?.userId;
      const result = await this.couponService.validate(code, itemCount, userId, subtotalCents);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  constructor(@inject(CouponService) private couponService: CouponService) {}
}
