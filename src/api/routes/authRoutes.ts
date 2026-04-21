import { container } from 'tsyringe';
import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { validate } from '../middlewares/validate';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  verifyCodeSchema,
  resetPasswordSchema,
  checkEmailStatusSchema,
  requestCheckoutVerificationSchema,
  verifyCheckoutCodeSchema,
} from '../schemas/userSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { recaptchaMiddleware } from '../middlewares/recaptchaMiddleware';
import { authLimiter } from '../../config/rateLimits';

const router = Router();
const authController = container.resolve(AuthController);

// Apply rate limiting to prevent brute force attacks
router.post(
  '/register',
  authLimiter,
  recaptchaMiddleware,
  validate(registerSchema),
  authController.register.bind(authController),
);
router.post(
  '/login',
  authLimiter,
  recaptchaMiddleware,
  validate(loginSchema),
  authController.login.bind(authController),
);

// Recovery password flow
router.post(
  '/forgot-password',
  authLimiter,
  recaptchaMiddleware,
  validate(forgotPasswordSchema),
  authController.forgotPassword.bind(authController),
);

router.post(
  '/verify-code',
  authLimiter,
  validate(verifyCodeSchema),
  authController.verifyCode.bind(authController),
);

router.post(
  '/reset-password',
  authLimiter,
  recaptchaMiddleware,
  validate(resetPasswordSchema),
  authController.resetPassword.bind(authController),
);

// E-mail verification flow (Unified)
router.post(
  '/email-status',
  authLimiter,
  validate(checkEmailStatusSchema),
  authController.checkEmailStatus.bind(authController),
);

router.post(
  '/request-verification',
  authLimiter,
  validate(requestCheckoutVerificationSchema),
  authController.requestEmailVerification.bind(authController),
);

router.post(
  '/verify-email-code',
  authLimiter,
  validate(verifyCheckoutCodeSchema),
  authController.verifyEmailCode.bind(authController),
);

router.get('/me', authMiddleware, authController.getProfile.bind(authController));
router.patch(
  '/me',
  authMiddleware,
  validate(updateProfileSchema),
  authController.updateProfile.bind(authController),
);

export default router;
