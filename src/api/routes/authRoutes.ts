import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema } from '../schemas/userSchemas';

import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const authController = new AuthController();

router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.post('/login', validate(loginSchema), authController.login.bind(authController));

router.get('/me', authMiddleware, authController.getProfile.bind(authController));
router.put('/me', authMiddleware, authController.updateProfile.bind(authController));

export default router;
