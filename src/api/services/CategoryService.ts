import { AppDataSource } from '../../data-source';
import { Category } from '../entities/Category';
import { AppError } from '../middlewares/errorHandler';
import { log } from '../../config/logger';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../constants';

/**
 * Service responsável pela lógica de negócio relacionada a categorias
 * Gerencia criação, consulta, atualização e remoção de categorias de produtos
 */
export class CategoryService {
  private categoryRepository = AppDataSource.getRepository(Category);

  /**
   * Retorna todas as categorias ordenadas por nome
   *
   * @returns Array de categorias com seus produtos relacionados
   *
   * @example
   * const categories = await categoryService.getAll();
   */
  async getAll() {
    log.info('Buscando todas as categorias');

    return this.categoryRepository.find({
      relations: ['products'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Busca uma categoria específica pelo ID
   *
   * @param id - ID da categoria
   * @returns Categoria encontrada com seus produtos
   * @throws {AppError} 404 - Se a categoria não for encontrada
   *
   * @example
   * const category = await categoryService.getOne(1);
   */
  async getOne(id: number) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!category) {
      log.warn('Categoria não encontrada', { categoryId: id });
      throw new AppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    log.info('Categoria encontrada', { categoryId: id, categoryName: category.name });
    return category;
  }

  /**
   * Busca uma categoria pelo slug (URL-friendly identifier)
   *
   * @param slug - Slug da categoria (ex: 'camisetas', 'calcados')
   * @returns Categoria encontrada com seus produtos
   * @throws {AppError} 404 - Se a categoria não for encontrada
   *
   * @example
   * const category = await categoryService.getBySlug('camisetas');
   */
  async getBySlug(slug: string) {
    const category = await this.categoryRepository.findOne({
      where: { slug },
      relations: ['products'],
    });

    if (!category) {
      log.warn('Categoria não encontrada por slug', { slug });
      throw new AppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    log.info('Categoria encontrada por slug', { slug, categoryName: category.name });
    return category;
  }

  /**
   * Cria uma nova categoria
   * Valida se o slug já não está em uso
   *
   * @param name - Nome da categoria
   * @param slug - Slug único da categoria (URL-friendly)
   * @returns Categoria criada
   * @throws {AppError} 400 - Se já existir uma categoria com o mesmo slug
   *
   * @example
   * const category = await categoryService.create('Camisetas', 'camisetas');
   */
  async create(name: string, slug: string) {
    // Verifica se o slug já existe
    const existingCategory = await this.categoryRepository.findOneBy({ slug });
    if (existingCategory) {
      log.warn('Tentativa de criar categoria com slug duplicado', { slug });
      throw new AppError('Já existe uma categoria com este slug', HTTP_STATUS.BAD_REQUEST);
    }

    const category = this.categoryRepository.create({ name, slug });
    const savedCategory = await this.categoryRepository.save(category);

    log.info('Nova categoria criada', {
      categoryId: savedCategory.id,
      name: savedCategory.name,
      slug: savedCategory.slug,
    });

    return savedCategory;
  }

  /**
   * Atualiza uma categoria existente
   * Verifica duplicidade de slug se ele for alterado
   *
   * @param id - ID da categoria a ser atualizada
   * @param name - Novo nome da categoria
   * @param slug - Novo slug da categoria
   * @returns Categoria atualizada
   * @throws {AppError} 404 - Se a categoria não for encontrada
   * @throws {AppError} 400 - Se o novo slug já estiver em uso
   *
   * @example
   * const updated = await categoryService.update(1, 'Camisetas Premium', 'camisetas-premium');
   */
  async update(id: number, name: string, slug: string) {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      log.warn('Tentativa de atualizar categoria inexistente', { categoryId: id });
      throw new AppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Verifica duplicidade de slug apenas se ele foi alterado
    if (slug !== category.slug) {
      const existingCategory = await this.categoryRepository.findOneBy({ slug });
      if (existingCategory) {
        log.warn('Tentativa de atualizar categoria com slug duplicado', { slug, categoryId: id });
        throw new AppError('Já existe uma categoria com este slug', HTTP_STATUS.BAD_REQUEST);
      }
    }

    category.name = name;
    category.slug = slug;

    const updatedCategory = await this.categoryRepository.save(category);

    log.info('Categoria atualizada', {
      categoryId: id,
      name: updatedCategory.name,
      slug: updatedCategory.slug,
    });

    return updatedCategory;
  }

  /**
   * Remove uma categoria do sistema
   *
   * @param id - ID da categoria a ser removida
   * @returns Mensagem de sucesso
   * @throws {AppError} 404 - Se a categoria não for encontrada
   *
   * @example
   * await categoryService.delete(1);
   */
  async delete(id: number) {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) {
      log.warn('Tentativa de deletar categoria inexistente', { categoryId: id });
      throw new AppError(ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    await this.categoryRepository.remove(category);

    log.info('Categoria deletada', { categoryId: id, categoryName: category.name });

    return { message: 'Categoria deletada com sucesso' };
  }
}
