import { Router } from 'express';
import { ContactController } from '../controllers/ContactController';
import { validate } from '../middlewares/validate';
import { createContactSchema } from '../schemas/contactSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const contactController = new ContactController();

// Public route - anyone can send a contact message
router.post('/', validate(createContactSchema), contactController.create.bind(contactController));

// Admin route - list all contact messages
router.get('/', authMiddleware, contactController.getAll.bind(contactController));

export default router;
