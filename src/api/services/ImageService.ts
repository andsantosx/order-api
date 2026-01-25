import { AppDataSource } from '../../data-source';
import { ProductImage } from '../entities/ProductImage';
import { Product } from '../entities/Product';
import { AppError } from '../middlewares/errorHandler';

export class ImageService {
    private imageRepository = AppDataSource.getRepository(ProductImage);
    private productRepository = AppDataSource.getRepository(Product);

    async getByProduct(productId: string) {
        return this.imageRepository.find({
            where: { product: { id: productId } },
            order: { url: 'ASC' }
        });
    }

    async create(productId: string, url: string) {
        const product = await this.productRepository.findOneBy({ id: productId });
        if (!product) {
            throw new AppError('Product not found', 404);
        }

        const image = this.imageRepository.create({ product, url });
        return this.imageRepository.save(image);
    }

    async delete(id: string) {
        const image = await this.imageRepository.findOneBy({ id });
        if (!image) {
            throw new AppError('Image not found', 404);
        }

        await this.imageRepository.remove(image);
        return { message: 'Image deleted successfully' };
    }
}
