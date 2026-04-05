import { Router } from 'express';
import { ContactController } from '../controllers/ContactController';
import { validate } from '../middlewares/validate';
import { createContactSchema } from '../schemas/contactSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { adminMiddleware } from '../middlewares/adminMiddleware';
import { recaptchaMiddleware } from '../middlewares/recaptchaMiddleware';

const router = Router();
const contactController = new ContactController();

/**
 * Public route - anyone can send a contact message
 * Protected by reCAPTCHA to prevent spam
 */
router.post(
  '/',
  recaptchaMiddleware,
  validate(createContactSchema),
  contactController.create.bind(contactController),
);

/**
 * Admin routes - restricted to authenticated administrators
 */
router.get('/', authMiddleware, adminMiddleware, contactController.getAll.bind(contactController));

router.get(
  '/:id',
  authMiddleware,
  adminMiddleware,
  contactController.getOne.bind(contactController),
);

router.post(
  '/:id/respond',
  authMiddleware,
  adminMiddleware,
  contactController.respond.bind(contactController),
);

router.patch(
  '/:id/status',
  authMiddleware,
  adminMiddleware,
  contactController.updateStatus.bind(contactController),
);

export default router;
