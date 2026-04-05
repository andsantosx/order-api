import { AppDataSource } from '../../data-source';
import { Product } from '../entities/Product';
import { Category } from '../entities/Category';
import { Brand } from '../entities/Brand';
import { Size } from '../entities/Size';
import { ProductSize } from '../entities/ProductSize';
import { ProductImage } from '../entities/ProductImage';
import { AppError } from '../middlewares/errorHandler';
import { log } from '../../config/logger';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../constants';
import { sanitizeProductData } from '../../utils/sanitizer';
import { executeInTransaction } from '../../utils/transaction';

/**
 * Interface para filtros de produtos
 * Centraliza todos os parâmetros de busca e filtro
 */
export interface ProductFilters {
  /** Busca por texto (nome ou descrição) */
  search?: string;

  /** Preço mínimo em centavos */
  minPrice?: number;

  /** Preço máximo em centavos */
  maxPrice?: number;

  /** IDs ou slugs de categorias para filtrar */
  categories?: string[];

  /** IDs ou slugs de marcas para filtrar */
  brands?: string[];

  /** IDs ou nomes de tamanhos para filtrar */
  sizes?: string[];

  /** Campo para ordenação (price, name, created_at) */
  sortBy?: 'price-low' | 'price-high' | 'newest' | string;

  /** Ordem de ordenação */
  sortOrder?: 'ASC' | 'DESC';

  /** Número da página (1-indexed) */
  page: number;

  /** Itens por página */
  limit: number;
}

/**
 * Service responsável pela lógica de negócio relacionada a produtos
 *
 * Funcionalidades:
 * - Listagem com filtros avançados (busca, preço, categoria, marca, tamanho)
 * - Paginação e ordenação
 * - Criação e atualização com validação de imagens
 * - Gerenciamento de tamanhos disponíveis
 * - Soft delete (inativação)
 *
 * Validações:
 * - URLs de imagem: whitelist de domínios permitidos
 * - Preços: valores positivos
 * - Sanitização: HTML removido de nome e descrição
 */
export class ProductService {
  private productRepository = AppDataSource.getRepository(Product);
  private categoryRepository = AppDataSource.getRepository(Category);
  private brandRepository = AppDataSource.getRepository(Brand);
  private sizeRepository = AppDataSource.getRepository(Size);
  private productSizeRepository = AppDataSource.getRepository(ProductSize);
  private productImageRepository = AppDataSource.getRepository(ProductImage);

  /**
   * Retorna produtos com filtros, paginação e ordenação
   *
   * Filtros suportados:
   * - **search**: Busca por nome ou descrição (case-insensitive)
   * - **minPrice/maxPrice**: Faixa de preço em centavos
   * - **categories**: Lista de IDs ou slugs de categorias
   * - **brands**: Lista de IDs ou slugs de marcas
   * - **sizes**: Lista de IDs ou nomes de tamanhos
   * - **sortBy**: Campo para ordenação (price/name/created_at)
   * - **sortOrder**: ASC ou DESC
   *
   * @param filters - Parâmetros de busca e filtro
   * @returns Produtos paginados e total de resultados
   *
   * @example
   * // Buscar camisetas Nike entre R$ 50 e R$ 150
   * const result = await productService.getAll({
   *   search: 'camiseta',
   *   minPrice: 5000,  // R$ 50
   *   maxPrice: 15000, // R$ 150
   *   brands: ['nike'],
   *   sortBy: 'price',
   *   sortOrder: 'ASC',
   *   page: 1,
   *   limit: 20
   * });
   */
  async getAll(filters: ProductFilters) {
    const {
      search,
      minPrice,
      maxPrice,
      categories,
      brands,
      sizes,
      sortBy = 'createdAt',
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const qb = this.productRepository
      .createQueryBuilder('product')
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
      qb.orderBy('product.priceCents', 'ASC');
    }

    if (sortBy === 'price-high') {
      qb.orderBy('product.priceCents', 'DESC');
    }

    if (!sortBy || sortBy === 'newest') {
      qb.orderBy('product.createdAt', 'DESC');
    }

    if (categories && categories.length > 0) {
      qb.andWhere('category.slug IN (:...categories)', { categories });
    }

    if (brands && brands.length > 0) {
      qb.andWhere('brand.slug IN (:...brands)', { brands });
    }

    if (sizes && sizes.length > 0) {
      qb.andWhere(
        (qb) => {
          const subQuery = qb
            .subQuery()
            .select('ps.productId')
            .from(ProductSize, 'ps')
            .leftJoin('ps.size', 's')
            .where('s.name IN (:...sizes)')
            .getQuery();
          return 'product.id IN ' + subQuery;
        },
        { sizes },
      );
    }

    if (search) {
      // Case insensitive search
      qb.andWhere('LOWER(product.name) LIKE :search', { search: `%${search.toLowerCase()}%` });
    }

    if (minPrice !== undefined) {
      qb.andWhere('product.priceCents >= :minPrice', { minPrice });
    }

    if (maxPrice !== undefined) {
      qb.andWhere('product.priceCents <= :maxPrice', { maxPrice });
    }

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Retorna os filtros disponíveis (facetas) para produtos
   *
   * Útil para construir interfaces de filtro dinâmicas
   * Retorna categorias, marcas e tamanhos disponíveis com contagem de produtos
   *
   * @returns Facetas com categorias, marcas e tamanhos
   *
   * @example
   * const filters = await productService.getAvailableFilters();
   * // { categories: [...], brands: [...], sizes: [...] }
   */
  async getAvailableFilters() {
    // Get all unique categories that have products
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .innerJoin('category.products', 'product') // Only categories with products
      .select(['category.name', 'category.slug'])
      .distinct(true)
      .orderBy('category.name', 'ASC')
      .getRawMany();

    // Get all unique sizes that are used in products
    const sizes = await this.sizeRepository
      .createQueryBuilder('size')
      .innerJoin('size.productSizes', 'ps')
      .select(['size.id', 'size.name'])
      .distinct(true)
      .orderBy('size.id', 'ASC') // Maintain logical order if IDs are ordered
      .getRawMany();

    // Get all unique brands that have products
    const brands = await this.brandRepository
      .createQueryBuilder('brand')
      .innerJoin('brand.products', 'product') // Only brands with products
      .select(['brand.name', 'brand.slug'])
      .distinct(true)
      .orderBy('brand.name', 'ASC')
      .getRawMany();

    return {
      categories: categories.map((c) => ({ name: c.category_name, slug: c.category_slug })),
      brands: brands.map((b) => ({ name: b.brand_name, slug: b.brand_slug })),
      sizes: sizes.map((s) => s.size_name),
    };
  }

  /**
   * Busca um produto específico pelo ID
   * Inclui todas as relações (categoria, marca, tamanhos, imagens)
   *
   * @param id - ID do produto
   * @returns Produto encontrado com todas as relações
   * @throws {AppError} 404 - Se o produto não for encontrado
   *
   * @example
   * const product = await productService.getOne('uuid-123');
   */
  async getOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'brand', 'sizes', 'sizes.size', 'images'],
      order: {
        sizes: { size: { id: 'ASC' } },
        images: { position: 'ASC' },
      },
    });

    if (!product) {
      log.warn('Produto não encontrado', { productId: id });
      throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    log.info('Produto encontrado', { productId: id, productName: product.name });
    return product;
  }

  /**
   * Cria um novo produto com suas relações
   *
   * @param name - Nome do produto
   * @param price_cents - Preço em centavos (ex: 4990 = R$ 49,90)
   * @param description - Descrição do produto (opcional)
   * @param currency - Moeda (ex: 'BRL')
   * @param categoryId - ID da categoria
   * @param brandId - ID da marca (opcional)
   * @param sizesData - Array de tamanhos disponíveis
   * @param images - Array de URLs de imagens (opcional)
   * @returns Produto criado com todas as relações
   * @throws {AppError} 404 - Se categoria ou marca não forem encontradas
   * @throws {AppError} 404 - Se algum tamanho não for encontrado
   *
   * @example
   * const product = await productService.create(
   *   'Camiseta Nike',
   *   4990,
   *   'Camiseta esportiva',
   *   'BRL',
   *   1, // categoryId
   *   2, // brandId
   *   [{ sizeId: 1 }, { sizeId: 2 }],
   *   ['https://example.com/image.jpg']
   * );
   */
  async create(
    name: string,
    priceCents: number,
    description: string | undefined,
    currency: string,
    categoryId: number,
    brandId: number | undefined,
    sizesData: { sizeId: number }[],
    images?: string[],
  ) {
    // Sanitização de dados
    const sanitized = sanitizeProductData({ name, description, images });
    const safeName = sanitized.name || name;
    const safeDescription = sanitized.description;
    const safeImages = sanitized.images || [];

    // Valida se a categoria existe
    const category = await this.categoryRepository.findOneBy({ id: categoryId });
    if (!category) {
      log.warn('Categoria não encontrada ao criar produto', { categoryId });
      throw new AppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Valida se a marca existe (se fornecida)
    let brand = null;
    if (brandId) {
      brand = await this.brandRepository.findOneBy({ id: brandId });
      if (!brand) {
        log.warn('Marca não encontrada ao criar produto', { brandId });
        throw new AppError(ERROR_MESSAGES.BRAND_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }
    }

    // Valida tamanhos primeiro
    let productSizes: ProductSize[] = [];
    if (sizesData && sizesData.length > 0) {
      const sizeIds = sizesData.map((s) => s.sizeId);
      const foundSizes = await this.sizeRepository.findByIds(sizeIds);

      if (foundSizes.length !== sizeIds.length) {
        log.warn('Tamanhos não encontrados ao criar produto', {
          requested: sizeIds.length,
          found: foundSizes.length,
        });
        throw new AppError('Um ou mais tamanhos não foram encontrados', HTTP_STATUS.NOT_FOUND);
      }

      // Cria entidades ProductSize (cascade vai salvar automaticamente)
      productSizes = sizesData.map((item) => {
        const size = foundSizes.find((s) => s.id === item.sizeId)!;
        return this.productSizeRepository.create({
          size: size,
        });
      });
    }

    // Cria entidades ProductImage (cascade vai salvar automaticamente)
    const productImages = safeImages.map((url, index) =>
      this.productImageRepository.create({
        url,
        position: index,
      }),
    );
    if (productImages.length > 0) {
      log.info('Imagens preparadas para produto', { count: productImages.length });
    }

    // Prepara produto COM todas as relações
    const product = this.productRepository.create({
      name: safeName,
      priceCents,
      description: safeDescription,
      currency,
      category,
      brand: brand || undefined,
      sizes: productSizes,
      images: productImages,
    });

    // Salva produto com cascade - salva imagens e tamanhos automaticamente
    const savedProduct = await this.productRepository.save(product);

    log.info('Novo produto criado', {
      productId: savedProduct.id,
      name: savedProduct.name,
      price: priceCents / 100,
    });

    return this.getOne(savedProduct.id);
  }

  /**
   * Atualiza um produto existente (Transactional)
   *
   * Permite atualizar qualquer campo do produto, incluindo suas relações
   * com categorias, marcas, tamanhos e imagens
   *
   * @param id - ID do produto a ser atualizado
   * @param data - Dados a serem atualizados
   * @returns Produto atualizado com todas as relações
   * @throws {AppError} 404 - Se produto, categoria, marca ou tamanho não forem encontrados
   *
   * @example
   * const updated = await productService.update('uuid-123', {
   *   name: 'Novo Nome',
   *   price_cents: 5990,
   *   images: ['https://new-image.jpg']
   * });
   */
  async update(
    id: string,
    data: {
      name?: string;
      priceCents?: number;
      description?: string;
      currency?: string;
      categoryId?: number;
      brandId?: number | null;
      sizes?: { sizeId: number }[];
      images?: string[];
    },
  ) {
    // Sanitização de dados de entrada
    const sanitized = sanitizeProductData({
      name: data.name,
      description: data.description,
      images: data.images,
    });

    // Executa toda a atualização dentro de uma transação para garantir integridade
    return executeInTransaction(async (entityManager) => {
      const productRepo = entityManager.getRepository(Product);
      const categoryRepo = entityManager.getRepository(Category);
      const brandRepo = entityManager.getRepository(Brand);
      const sizeRepo = entityManager.getRepository(Size);
      const productImageRepo = entityManager.getRepository(ProductImage);
      const productSizeRepo = entityManager.getRepository(ProductSize);

      const product = await productRepo.findOne({
        where: { id },
        relations: ['sizes', 'images'],
      });

      if (!product) {
        log.warn('Produto não encontrado para atualização', { productId: id });
        throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      // Atualiza campos básicos
      if (data.name !== undefined) product.name = sanitized.name!;
      if (data.priceCents !== undefined) product.priceCents = data.priceCents;
      if (data.description !== undefined) product.description = sanitized.description;
      if (data.currency !== undefined) product.currency = data.currency;

      // Atualiza categoria se fornecida
      if (data.categoryId !== undefined) {
        const category = await categoryRepo.findOneBy({ id: data.categoryId });
        if (!category) {
          log.warn('Categoria não encontrada ao atualizar produto', {
            categoryId: data.categoryId,
          });
          throw new AppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }
        product.category = category;
      }

      // Atualiza marca se fornecida
      if (data.brandId !== undefined) {
        if (data.brandId === null) {
          product.brand = null;
          log.info('Marca removida do produto', { productId: id });
        }

        if (data.brandId !== null) {
          const brand = await brandRepo.findOneBy({ id: data.brandId });
          if (!brand) {
            log.warn('Marca não encontrada ao atualizar produto', { brandId: data.brandId });
            throw new AppError(ERROR_MESSAGES.BRAND_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
          }
          product.brand = brand;
        }
      }

      // Atualiza imagens se fornecidas
      if (sanitized.images) {
        // Remove imagens antigas primeiro (previne linhas órfãs)
        if (product.images && product.images.length > 0) {
          await productImageRepo.remove(product.images);
          log.info('Imagens antigas removidas', { productId: id, count: product.images.length });
        }

        // Cria novas entidades ProductImage (cascade vai salvar)
        const productImages = sanitized.images.map((url, index) =>
          productImageRepo.create({
            url,
            position: index,
            product, // Vincula explicitamente ao produto
          }),
        );

        // Atribui novas imagens ao produto
        product.images = productImages;
        log.info('Novas imagens atribuídas', { productId: id, count: productImages.length });
      }

      // Atualiza tamanhos se fornecidos
      if (data.sizes) {
        const sizeIds = data.sizes.map((s) => s.sizeId);
        const foundSizes = await sizeRepo.findByIds(sizeIds);

        if (foundSizes.length !== sizeIds.length) {
          log.warn('Tamanhos não encontrados ao atualizar produto', {
            productId: id,
            requested: sizeIds.length,
            found: foundSizes.length,
          });
          throw new AppError('Um ou mais tamanhos não foram encontrados', HTTP_STATUS.NOT_FOUND);
        }

        // Remove tamanhos antigos primeiro (previne linhas órfãs)
        if (product.sizes && product.sizes.length > 0) {
          await productSizeRepo.remove(product.sizes);
          log.info('Tamanhos antigos removidos', { productId: id, count: product.sizes.length });
        }

        // Cria novas entidades ProductSize (cascade vai salvar)
        const productSizes = data.sizes.map((item) => {
          const size = foundSizes.find((s) => s.id === item.sizeId)!;
          return productSizeRepo.create({
            size: size,
            product, // Vincula explicitamente ao produto
          });
        });

        // Atribui novos tamanhos ao produto
        product.sizes = productSizes;
        log.info('Novos tamanhos atribuídos', { productId: id, count: productSizes.length });
      }

      // Salva produto com cascade - atualiza imagens e tamanhos automaticamente
      await productRepo.save(product);

      log.info('Produto atualizado', { productId: id, name: product.name });

      return this.getOne(id);
    });
  }

  /**
   * Remove um produto do sistema
   *
   * @param id - ID do produto a ser removido
   * @returns Mensagem de sucesso
   * @throws {AppError} 404 - Se o produto não for encontrado
   *
   * @example
   * await productService.delete('uuid-123');
   */
  async delete(id: string) {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) {
      log.warn('Produto não encontrado para remoção', { productId: id });
      throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    await this.productRepository.remove(product);

    log.info('Produto deletado', { productId: id, productName: product.name });

    return { message: 'Produto deletado com sucesso' };
  }
}
