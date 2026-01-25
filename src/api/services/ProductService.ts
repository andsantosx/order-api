import { AppDataSource } from '../../data-source';
import { Product } from '../entities/Product';
import { Category } from '../entities/Category';
import { Size } from '../entities/Size';
import { AppError } from '../middlewares/errorHandler';

export class ProductService {
    private productRepository = AppDataSource.getRepository(Product);
    private categoryRepository = AppDataSource.getRepository(Category);
    private sizeRepository = AppDataSource.getRepository(Size);

    async getAll(categorySlug?: string, page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;
        const where = categorySlug ? { category: { slug: categorySlug } } : {};

        const [data, total] = await this.productRepository.findAndCount({
            where,
            relations: ['category', 'size', 'images'],
            skip,
            take: limit,
            order: { name: 'ASC' }
        });

        return { data, total, page, limit };
    }

    async getOne(id: string) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['category', 'size', 'images']
        });

        if (!product) {
            throw new AppError('Produto não encontrado', 404);
        }

        return product;
    }

    async create(name: string, price_cents: number, currency: string, categoryId: string, sizeId: number) {
        const category = await this.categoryRepository.findOneBy({ id: categoryId });
        if (!category) {
            throw new AppError('Categoria não encontrada', 404);
        }

        const size = await this.sizeRepository.findOneBy({ id: sizeId });
        if (!size) {
            throw new AppError('Tamanho não encontrado', 404);
        }

        const product = this.productRepository.create({
            name,
            price_cents,
            currency,
            category,
            size
        });

        return this.productRepository.save(product);
    }

    async update(id: string, data: { name?: string; price_cents?: number; currency?: string; categoryId?: string; sizeId?: number }) {
        const product = await this.productRepository.findOneBy({ id });
        if (!product) {
            throw new AppError('Produto não encontrado', 404);
        }

        if (data.categoryId) {
            const category = await this.categoryRepository.findOneBy({ id: data.categoryId });
            if (!category) {
                throw new AppError('Categoria não encontrada', 404);
            }
            product.category = category;
        }

        if (data.sizeId) {
            const size = await this.sizeRepository.findOneBy({ id: data.sizeId });
            if (!size) {
                throw new AppError('Tamanho não encontrado', 404);
            }
            product.size = size;
        }

        if (data.name) product.name = data.name;
        if (data.price_cents) product.price_cents = data.price_cents;
        if (data.currency) product.currency = data.currency;

        return this.productRepository.save(product);
    }

    async delete(id: string) {
        const product = await this.productRepository.findOneBy({ id });
        if (!product) {
            throw new AppError('Produto não encontrado', 404);
        }

        await this.productRepository.remove(product);
        return { message: 'Produto deletado com sucesso' };
    }
}
