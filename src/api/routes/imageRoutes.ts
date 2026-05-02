import { container } from 'tsyringe';
import { Router } from 'express';
import multer from 'multer';
import { ImageController } from '../controllers/ImageController';
import { validate } from '../middlewares/validate';
import { createImageSchema } from '../schemas/imageSchemas';
import { authMiddleware } from '../middlewares/authMiddleware';
import { uploadProductImage } from '../controllers/ImageUploadController';
import { imageUploadLimiter } from '../../config/rateLimits';

const router = Router();
const imageController = container.resolve(ImageController);

/**
 * Configuração do multer: armazena o arquivo em memória (Buffer)
 * para repassar diretamente ao ImgBB sem salvar em disco.
 * Limite: 32MB (conta gratuita ImgBB).
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 32 * 1024 * 1024, // 32MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
    }
  },
});

// ==========================================
// Rotas públicas
// ==========================================

router.get('/product/:productId', imageController.getByProduct.bind(imageController));

// ==========================================
// Rotas protegidas (admin)
// ==========================================

/**
 * POST /api/images/upload
 * Recebe imagem processada (Canvas 800×800, fundo branco) e faz upload para ImgBB.
 * Retorna a URL permanente para ser salva no produto.
 */
router.post(
  '/upload',
  authMiddleware,
  imageUploadLimiter,
  upload.single('image'),
  uploadProductImage,
);

router.post(
  '/product/:productId',
  authMiddleware,
  validate(createImageSchema),
  imageController.create.bind(imageController),
);

router.delete('/:id', authMiddleware, imageController.delete.bind(imageController));

export default router;
