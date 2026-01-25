import { AppDataSource } from '../../data-source';
import { Product } from '../entities/Product';
import { Category } from '../entities/Category';
import { Size } from '../entities/Size';
import { ProductSize } from '../entities/ProductSize';
import { AppError } from '../middlewares/errorHandler';

export class ProductService {
    private productRepository = AppDataSource.getRepository(Product);
    private categoryRepository = AppDataSource.getRepository(Category);
    private sizeRepository = AppDataSource.getRepository(Size);
    private productSizeRepository = AppDataSource.getRepository(ProductSize);

    async getAll(categorySlug?: string, page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;
        const where = categorySlug ? { category: { slug: categorySlug } } : {};

        const [data, total] = await this.productRepository.findAndCount({
            where,
            relations: ['category', 'sizes', 'sizes.size', 'images'],
            skip,
            take: limit,
            order: { name: 'ASC' }
        });

        return { data, total, page, limit };
    }

    async getOne(id: string) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['category', 'sizes', 'sizes.size', 'images']
        });

        if (!product) {
            throw new AppError('Produto não encontrado', 404);
        }

        return product;
    }

    async create(name: string, price_cents: number, currency: string, categoryId: number, sizeIds: number[]) {
        const category = await this.categoryRepository.findOneBy({ id: categoryId });
        if (!category) {
            throw new AppError('Categoria não encontrada', 404);
        }

        // Verificar se todos os tamanhos existem
        const sizes = await this.sizeRepository.findByIds(sizeIds);
        if (sizes.length !== sizeIds.length) {
            throw new AppError('Um ou mais tamanhos não foram encontrados', 404);
        }

        const product = this.productRepository.create({
            name,
            price_cents,
            currency,
            category
        });

        const savedProduct = await this.productRepository.save(product);

        // Criar relações com os tamanhos
        const productSizes = sizeIds.map(sizeId => {
            return this.productSizeRepository.create({
                product: savedProduct,
                size: sizes.find(s => s.id === sizeId)!
            });
        });

        await this.productSizeRepository.save(productSizes);

        return this.getOne(savedProduct.id);
    }

    async update(id: string, data: { name?: string; price_cents?: number; currency?: string; categoryId?: number; sizeIds?: number[] }) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['sizes']
        });

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

        if (data.name) product.name = data.name;
        if (data.price_cents) product.price_cents = data.price_cents;
        if (data.currency) product.currency = data.currency;

        await this.productRepository.save(product);

        // Atualizar tamanhos se fornecidos
        if (data.sizeIds) {
            // Remover tamanhos antigos
            await this.productSizeRepository.delete({ product: { id } });

            // Verificar se todos os tamanhos existem
            const sizes = await this.sizeRepository.findByIds(data.sizeIds);
            if (sizes.length !== data.sizeIds.length) {
                throw new AppError('Um ou mais tamanhos não foram encontrados', 404);
            }

            // Criar novos tamanhos
            const productSizes = data.sizeIds.map(sizeId => {
                return this.productSizeRepository.create({
                    product: product,
                    size: sizes.find(s => s.id === sizeId)!
                });
            });

            await this.productSizeRepository.save(productSizes);
        }

        return this.getOne(id);
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
