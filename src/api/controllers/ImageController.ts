import { Request, Response, NextFunction } from 'express';
import { ImageService } from '../services/ImageService';

export class ImageController {
    private imageService = new ImageService();

    async getByProduct(req: Request, res: Response, next: NextFunction) {
        const { productId } = req.params;
        const images = await this.imageService.getByProduct(productId as string);
        res.json(images);
    }

    async create(req: Request, res: Response, next: NextFunction) {
        const { productId } = req.params;
        const { url } = req.body;
        const image = await this.imageService.create(productId as string, url);

        // Retornar apenas dados essenciais
        res.status(201).json({
            id: image.id,
            url: image.url,
            product_id: productId
        });
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const result = await this.imageService.delete(parseInt(id as string));
        res.json(result);
    }
}
