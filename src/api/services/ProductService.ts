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

    /**
     * Retorna produtos com paginação e filtro parametrizado.
     */
    async getAll(params: {
        search?: string,
        minPrice?: number,
        maxPrice?: number,
        categorySlug?: string,
        page: number,
        limit: number
    }) {
        const { search, minPrice, maxPrice, categorySlug, page = 1, limit = 20 } = params;
        const skip = (page - 1) * limit;

        const qb = this.productRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.sizes', 'productSizes')
            .leftJoinAndSelect('productSizes.size', 'size')
            .leftJoinAndSelect('product.images', 'images')
            .skip(skip)
            .take(limit)
            .orderBy('product.name', 'ASC');

        if (categorySlug) {
            qb.andWhere('category.slug = :slug', { slug: categorySlug });
        }

        if (search) { // Case insensitive search
            qb.andWhere('LOWER(product.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
        }

        if (minPrice !== undefined) {
            // Assuming price is in cents for consistency
            qb.andWhere('product.price_cents >= :minPrice', { minPrice });
        }

        if (maxPrice !== undefined) {
            qb.andWhere('product.price_cents <= :maxPrice', { maxPrice });
        }

        const [data, total] = await qb.getManyAndCount();

        return { data, total, page, limit };
    }

    /**
     * Busca um produto pelo ID.
     */
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

    /**
     * Cria um novo produto e vincula aos tamanhos com quantidade.
     */
    async create(name: string, price_cents: number, currency: string, categoryId: number, sizesData: { sizeId: number, quantity?: number }[]) {
        const category = await this.categoryRepository.findOneBy({ id: categoryId });
        if (!category) {
            throw new AppError('Categoria não encontrada', 404);
        }

        // Prepare product
        const product = this.productRepository.create({
            name,
            price_cents,
            currency,
            category
        });

        const savedProduct = await this.productRepository.save(product);

        // Handle sizes (expecting array of objects now)
        if (sizesData && sizesData.length > 0) {
            const sizeIds = sizesData.map(s => s.sizeId);
            const foundSizes = await this.sizeRepository.findByIds(sizeIds);

            if (foundSizes.length !== sizeIds.length) {
                throw new AppError('Um ou mais tamanhos não foram encontrados', 404);
            }

            const productSizes = sizesData.map(item => {
                const size = foundSizes.find(s => s.id === item.sizeId)!;
                return this.productSizeRepository.create({
                    product: savedProduct,
                    size: size,
                    quantity: item.quantity || 0
                });
            });

            await this.productSizeRepository.save(productSizes);
        }

        return this.getOne(savedProduct.id);
    }

    /**
     * Atualiza um produto.
     */
    async update(id: string, data: { name?: string; price_cents?: number; currency?: string; categoryId?: number; sizes?: { sizeId: number, quantity?: number }[] }) {
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

        // Update sizes if provided
        if (data.sizes) {
            // Remove old associations
            await this.productSizeRepository.delete({ product: { id } });

            const sizeIds = data.sizes.map(s => s.sizeId);
            const foundSizes = await this.sizeRepository.findByIds(sizeIds);

            if (foundSizes.length !== sizeIds.length) {
                throw new AppError('Um ou mais tamanhos não foram encontrados', 404);
            }

            const productSizes = data.sizes.map(item => {
                const size = foundSizes.find(s => s.id === item.sizeId)!;
                return this.productSizeRepository.create({
                    product: product,
                    size: size,
                    quantity: item.quantity || 0
                });
            });

            await this.productSizeRepository.save(productSizes);
        }

        return this.getOne(id);
    }

    /**
     * Remove um produto.
     */
    async delete(id: string) {
        const result = await this.productRepository.softDelete(id);
        if (result.affected === 0) {
            throw new AppError('Produto não encontrado', 404);
        }
        return { message: 'Produto deletado com sucesso' };
    }
}
