import { Request, Response, NextFunction } from 'express';
import { ImageService } from '../services/ImageService';
import { injectable, inject } from 'tsyringe';

@injectable()
export class ImageController {
  /**
   * Retorna todas as imagens de um produto específico.
   */
  async getByProduct(req: Request, res: Response, _next: NextFunction) {
    const { productId } = req.params;
    const images = await this.imageService.getByProduct(productId as string);
    res.json(images);
  }

  /**
   * Adiciona uma nova imagem a um produto.
   */
  async create(req: Request, res: Response, _next: NextFunction) {
    const { productId } = req.params;
    const { url } = req.body;
    const image = await this.imageService.create(productId as string, url);

    // Retornar apenas dados essenciais
    res.status(201).json({
      id: image.id,
      url: image.url,
      product_id: productId,
    });
  }

  /**
   * Remove uma imagem pelo ID.
   */
  async delete(req: Request, res: Response, _next: NextFunction) {
    const { id } = req.params;
    const result = await this.imageService.delete(parseInt(id as string));
    res.json(result);
  }

  constructor(@inject(ImageService) private imageService: ImageService) {}
}
