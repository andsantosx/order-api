import { Request, Response, NextFunction } from 'express';
import { uploadToImgBB } from '../services/ImageUploadService';
import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';

/**
 * Controller de upload de imagens de produto.
 *
 * Recebe um arquivo via multipart/form-data (processado pelo multer),
 * repassa para o ImgBB e retorna a URL permanente da imagem.
 *
 * O processamento visual (redimensionamento 800×800, fundo branco) já foi
 * feito no frontend pelo Canvas API antes do envio.
 */
export async function uploadProductImage(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const file = req.file;

  if (!file) {
    throw new AppError('Nenhum arquivo enviado.', HTTP_STATUS.BAD_REQUEST);
  }

  const result = await uploadToImgBB(file.buffer, file.mimetype, file.originalname);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    url: result.url,
    displayUrl: result.displayUrl,
    width: result.width,
    height: result.height,
    sizeBytes: result.size,
  });
}
