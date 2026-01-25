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
            throw new AppError('Produto não encontrado', 404);
        }

        const image = this.imageRepository.create({ product, url });
        return this.imageRepository.save(image);
    }

    async delete(id: number) {
        const image = await this.imageRepository.findOneBy({ id });
        if (!image) {
            throw new AppError('Imagem não encontrada', 404);
        }

        await this.imageRepository.remove(image);
        return { message: 'Imagem deletada com sucesso' };
    }
}
