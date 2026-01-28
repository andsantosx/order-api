import { Router } from 'express';
import { AddressController } from '../controllers/AddressController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();
const addressController = new AddressController();

router.use(authMiddleware);

router.get('/addresses', addressController.list.bind(addressController));
router.post('/addresses', addressController.create.bind(addressController));
router.delete('/addresses/:id', addressController.delete.bind(addressController));

export default router;
