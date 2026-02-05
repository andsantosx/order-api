import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/userSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { authLimiter } from '../../config/rateLimits';

const router = Router();
const authController = new AuthController();

// Apply rate limiting to prevent brute force attacks
router.post('/register', authLimiter, validate(registerSchema), authController.register.bind(authController));
router.post('/login', authLimiter, validate(loginSchema), authController.login.bind(authController));

router.get('/me', authMiddleware, authController.getProfile.bind(authController));
router.put('/me', authMiddleware, validate(updateProfileSchema), authController.updateProfile.bind(authController));

export default router;
