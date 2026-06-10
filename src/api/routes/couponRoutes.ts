import { container } from 'tsyringe';
import { Router } from 'express';
import { CouponController } from '../controllers/CouponController';
import { validate } from '../middlewares/validate';
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} from '../schemas/couponSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { auditMiddleware } from '../middlewares/auditMiddleware';
import { optionalAuthMiddleware } from '../middlewares/optionalAuthMiddleware';

const router = Router();
const couponController = container.resolve(CouponController);

// Rota pública para validação de cupom no carrinho/checkout
// optionalAuthMiddleware: se o usuário estiver logado, verifica o limite por usuário
router.get('/validate', optionalAuthMiddleware, validate(validateCouponSchema), couponController.validate.bind(couponController));

// Rotas do painel admin (todas requerem autenticação de admin e são auditadas)
router.get('/', authMiddleware, adminMiddleware, couponController.getAll.bind(couponController));
router.get('/:id', authMiddleware, adminMiddleware, couponController.getOne.bind(couponController));

router.post(
  '/',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('CREATE_COUPON'),
  validate(createCouponSchema),
  couponController.create.bind(couponController),
);

router.patch(
  '/:id',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('UPDATE_COUPON'),
  validate(updateCouponSchema),
  couponController.update.bind(couponController),
);

router.delete(
  '/:id',
  authMiddleware,
  adminMiddleware,
  auditMiddleware('DELETE_COUPON'),
  couponController.delete.bind(couponController),
);

export default router;
