import { AppDataSource } from '../../data-source';
import { ProductVariant } from '../entities/ProductVariant';
import { Product } from '../entities/Product';
import { Size } from '../entities/Size';
import { AppError } from '../middlewares/errorHandler';

export class VariantService {
    private variantRepository = AppDataSource.getRepository(ProductVariant);
    private productRepository = AppDataSource.getRepository(Product);
    private sizeRepository = AppDataSource.getRepository(Size);

    async getByProduct(productId: string) {
        return this.variantRepository.find({
            where: { product: { id: productId } },
            relations: ['size', 'product'],
            order: { size: { name: 'ASC' } }
        });
    }

    async getOne(id: string) {
        const variant = await this.variantRepository.findOne({
            where: { id },
            relations: ['size', 'product']
        });

        if (!variant) {
            throw new AppError('Variante não encontrada', 404);
        }

        return variant;
    }

    async create(productId: string, sizeId: string, stock: number, price_cents?: number) {
        const product = await this.productRepository.findOneBy({ id: productId });
        if (!product) {
            throw new AppError('Produto não encontrado', 404);
        }

        const size = await this.sizeRepository.findOneBy({ id: sizeId });
        if (!size) {
            throw new AppError('Tamanho não encontrado', 404);
        }

        const variant = this.variantRepository.create({
            product,
            size,
            stock,
            price_cents
        });

        return this.variantRepository.save(variant);
    }

    async updateStock(id: string, stock: number) {
        const variant = await this.variantRepository.findOneBy({ id });
        if (!variant) {
            throw new AppError('Variante não encontrada', 404);
        }

        variant.stock = stock;
        return this.variantRepository.save(variant);
    }

    async update(id: string, data: { sizeId?: string; stock?: number; price_cents?: number }) {
        const variant = await this.variantRepository.findOne({
            where: { id },
            relations: ['size']
        });

        if (!variant) {
            throw new AppError('Variante não encontrada', 404);
        }

        if (data.sizeId) {
            const size = await this.sizeRepository.findOneBy({ id: data.sizeId });
            if (!size) {
                throw new AppError('Tamanho não encontrado', 404);
            }
            variant.size = size;
        }

        if (data.stock !== undefined) variant.stock = data.stock;
        if (data.price_cents !== undefined) variant.price_cents = data.price_cents;

        return this.variantRepository.save(variant);
    }

    async delete(id: string) {
        const variant = await this.variantRepository.findOneBy({ id });
        if (!variant) {
            throw new AppError('Variante não encontrada', 404);
        }

        await this.variantRepository.remove(variant);
        return { message: 'Variante deletada com sucesso' };
    }
}
