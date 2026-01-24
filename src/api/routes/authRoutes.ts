import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate } from '../middlewares/validate';
import { registerUserSchema, loginUserSchema } from '../schemas/userSchemas';

const router = Router();
const authController = new AuthController();

router.post('/register', validate(registerUserSchema), authController.register.bind(authController));
router.post('/login', validate(loginUserSchema), authController.login.bind(authController));

export default router;
