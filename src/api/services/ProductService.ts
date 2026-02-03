import { AppDataSource } from '../../data-source';
import { Product } from '../entities/Product';
import { Category } from '../entities/Category';
import { Brand } from '../entities/Brand';
import { Size } from '../entities/Size';
import { ProductSize } from '../entities/ProductSize';
import { ProductImage } from '../entities/ProductImage';
import { AppError } from '../middlewares/errorHandler';

export class ProductService {
    private productRepository = AppDataSource.getRepository(Product);
    private categoryRepository = AppDataSource.getRepository(Category);
    private brandRepository = AppDataSource.getRepository(Brand);
    private sizeRepository = AppDataSource.getRepository(Size);
    private productSizeRepository = AppDataSource.getRepository(ProductSize);
    private productImageRepository = AppDataSource.getRepository(ProductImage);

    /**
     * Retorna produtos com paginação e filtro parametrizado.
     */
    async getAll(params: {
        search?: string,
        minPrice?: number,
        maxPrice?: number,
        categories?: string[],
        brands?: string[],
        sizes?: string[],
        sortBy?: string,
        page: number,
        limit: number
    }) {
        const { search, minPrice, maxPrice, categories, brands, sizes, sortBy, page = 1, limit = 20 } = params;
        const skip = (page - 1) * limit;

        const qb = this.productRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.brand', 'brand')
            .leftJoinAndSelect('product.sizes', 'productSizes')
            .leftJoinAndSelect('productSizes.size', 'size')
            .leftJoinAndSelect('product.images', 'images')
            .addOrderBy('images.position', 'ASC')
            .addOrderBy('size.id', 'ASC')
            .skip(skip)
            .take(limit);

        if (sortBy === 'price-low') {
            qb.orderBy('product.price_cents', 'ASC');
        } else if (sortBy === 'price-high') {
            qb.orderBy('product.price_cents', 'DESC');
        } else {
            // "Mais Recentes" -> Filter last 30 days AND sort by newest
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            qb.andWhere('product.created_at >= :thirtyDaysAgo', { thirtyDaysAgo });
            qb.orderBy('product.created_at', 'DESC');
        }

        if (categories && categories.length > 0) {
            qb.andWhere('category.slug IN (:...categories)', { categories });
        }

        if (brands && brands.length > 0) {
            qb.andWhere('brand.slug IN (:...brands)', { brands });
        }

        if (sizes && sizes.length > 0) {
            // Filter products that have at least one of the selected sizes
            // We use a subquery or join filter logic.
            // Since we already joined productSizes and size, we can filter on size.name
            // IMPORTANT: If we just filter, we might get duplicate product rows if multiple sizes match, 
            // but TypeORM handles hydration. However, strict filtering often requires checks.
            // A safer way for "has one of these sizes" is:
            qb.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select("ps.product_id")
                    .from(ProductSize, "ps")
                    .leftJoin("ps.size", "s")
                    .where("s.name IN (:...sizes)")
                    .getQuery();
                return "product.id IN " + subQuery;
            }, { sizes });
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
     * Retorna os filtros disponíveis (facetas).
     */
    async getAvailableFilters() {
        // Get all unique categories that have products
        const categories = await this.categoryRepository.createQueryBuilder("category")
            .innerJoin("category.products", "product") // Only categories with products
            .select(["category.name", "category.slug"])
            .distinct(true)
            .orderBy("category.name", "ASC")
            .getRawMany();

        // Get all unique sizes that are used in products
        const sizes = await this.sizeRepository.createQueryBuilder("size")
            .innerJoin("size.productSizes", "ps")
            .select(["size.id", "size.name"])
            .distinct(true)
            .orderBy("size.id", "ASC") // Maintain logical order if IDs are ordered
            .getRawMany();

        // Get all unique brands that have products
        const brands = await this.brandRepository.createQueryBuilder("brand")
            .innerJoin("brand.products", "product") // Only brands with products
            .select(["brand.name", "brand.slug"])
            .distinct(true)
            .orderBy("brand.name", "ASC")
            .getRawMany();

        return {
            categories: categories.map(c => ({ name: c.category_name, slug: c.category_slug })),
            brands: brands.map(b => ({ name: b.brand_name, slug: b.brand_slug })),
            sizes: sizes.map(s => s.size_name)
        };
    }

    /**
     * Busca um produto pelo ID.
     */
    async getOne(id: string) {
        const product = await this.productRepository.findOne({
            where: { id },
            relations: ['category', 'brand', 'sizes', 'sizes.size', 'images'],
            order: {
                images: {
                    position: 'ASC'
                },
                sizes: {
                    size: {
                        id: 'ASC'
                    }
                }
            }
        });

        if (!product) {
            throw new AppError('Produto não encontrado', 404);
        }

        return product;
    }

    /**
     * Cria um novo produto e vincula aos tamanhos com quantidade.
     */
    async create(name: string, price_cents: number, description: string | undefined, currency: string, categoryId: number, brandId: number | undefined, sizesData: { sizeId: number, quantity?: number }[], images?: string[]) {
        const category = await this.categoryRepository.findOneBy({ id: categoryId });
        if (!category) {
            throw new AppError('Categoria não encontrada', 404);
        }

        let brand = null;
        if (brandId) {
            brand = await this.brandRepository.findOneBy({ id: brandId });
            if (!brand) {
                throw new AppError('Marca não encontrada', 404);
            }
        }

        // Prepare product
        const product = this.productRepository.create({
            name,
            price_cents,
            description,
            currency,
            category,
            brand: brand || undefined
        });

        if (images && images.length > 0) {
            const productImages = images.map((url, index) => this.productImageRepository.create({ url, position: index }));
            product.images = productImages;
        }

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
    async update(id: string, data: { name?: string; price_cents?: number; description?: string; currency?: string; categoryId?: number; brandId?: number; sizes?: { sizeId: number, quantity?: number }[] }) {
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

        if (data.brandId) {
            const brand = await this.brandRepository.findOneBy({ id: data.brandId });
            if (!brand) {
                throw new AppError('Marca não encontrada', 404);
            }
            product.brand = brand;
        }

        if (data.name) product.name = data.name;
        if (data.price_cents) product.price_cents = data.price_cents;
        if (data.description !== undefined) product.description = data.description;
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
