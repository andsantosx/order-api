import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate } from '../middlewares/validate';
import { registerSchema, loginSchema } from '../schemas/userSchemas';

const router = Router();
const authController = new AuthController();

router.post('/register', validate(registerSchema), authController.register.bind(authController));
router.post('/login', validate(loginSchema), authController.login.bind(authController));

export default router;
