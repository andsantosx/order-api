import { AppDataSource } from '../../data-source';
import { Brand } from '../entities/Brand';
import { AppError } from '../middlewares/errorHandler';
import { log } from '../../config/logger';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../constants';
import { injectable } from 'tsyringe';

/**
 * Service responsável pela lógica de negócio relacionada a marcas
 * Gerencia criação, consulta, atualização e remoção de marcas de produtos
 */
@injectable()
export class BrandService {
  private brandRepository = AppDataSource.getRepository(Brand);

  /**
   * Retorna todas as marcas ordenadas por nome
   *
   * @returns Array de marcas com seus produtos relacionados
   *
   * @example
   * const brands = await brandService.getAll();
   */
  async getAll() {
    log.info('Buscando todas as marcas');

    return this.brandRepository.find({
      relations: ['products'],
      order: { name: 'ASC' },
    });
  }

  /**
   * Busca uma marca específica pelo ID
   *
   * @param id - ID da marca
   * @returns Marca encontrada com seus produtos
   * @throws {AppError} 404 - Se a marca não for encontrada
   *
   * @example
   * const brand = await brandService.getOne(1);
   */
  async getOne(id: number) {
    const brand = await this.brandRepository.findOne({
      where: { id },
      relations: ['products'],
    });

    if (!brand) {
      log.warn('Marca não encontrada', { brandId: id });
      throw new AppError(ERROR_MESSAGES.BRAND_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    log.info('Marca encontrada', { brandId: id, brandName: brand.name });
    return brand;
  }

  /**
   * Busca uma marca pelo slug (URL-friendly identifier)
   *
   * @param slug - Slug da marca (ex: 'nike', 'adidas')
   * @returns Marca encontrada com seus produtos
   * @throws {AppError} 404 - Se a marca não for encontrada
   *
   * @example
   * const brand = await brandService.getBySlug('nike');
   */
  async getBySlug(slug: string) {
    const brand = await this.brandRepository.findOne({
      where: { slug },
      relations: ['products'],
    });

    if (!brand) {
      log.warn('Marca não encontrada por slug', { slug });
      throw new AppError(ERROR_MESSAGES.BRAND_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    log.info('Marca encontrada por slug', { slug, brandName: brand.name });
    return brand;
  }

  /**
   * Cria uma nova marca
   * Valida se o slug já não está em uso
   *
   * @param name - Nome da marca
   * @param slug - Slug único da marca (URL-friendly)
   * @returns Marca criada
   * @throws {AppError} 400 - Se já existir uma marca com o mesmo slug
   *
   * @example
   * const brand = await brandService.create('Nike', 'nike');
   */
  async create(name: string, slug: string) {
    // Verifica se o slug já existe
    const existingBrand = await this.brandRepository.findOneBy({ slug });
    if (existingBrand) {
      log.warn('Tentativa de criar marca com slug duplicado', { slug });
      throw new AppError('Já existe uma marca com este slug', HTTP_STATUS.BAD_REQUEST);
    }

    const brand = this.brandRepository.create({ name, slug });
    const savedBrand = await this.brandRepository.save(brand);

    log.info('Nova marca criada', {
      brandId: savedBrand.id,
      name: savedBrand.name,
      slug: savedBrand.slug,
    });

    return savedBrand;
  }

  /**
   * Atualiza uma marca existente
   * Verifica duplicidade de slug se ele for alterado
   *
   * @param id - ID da marca a ser atualizada
   * @param data - Dados para atualização (nome e/ou slug)
   * @returns Marca atualizada
   * @throws {AppError} 404 - Se a marca não for encontrada
   * @throws {AppError} 400 - Se o novo slug já estiver em uso
   *
   * @example
   * const updated = await brandService.update(1, { name: 'Nike Pro' });
   */
  async update(id: number, data: { name?: string; slug?: string }) {
    const brand = await this.brandRepository.findOneBy({ id });
    if (!brand) {
      log.warn('Tentativa de atualizar marca inexistente', { brandId: id });
      throw new AppError(ERROR_MESSAGES.BRAND_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Verifica duplicidade de slug apenas se ele foi fornecido e alterado
    if (data.slug && data.slug !== brand.slug) {
      const existingBrand = await this.brandRepository.findOneBy({ slug: data.slug });
      if (existingBrand) {
        log.warn('Tentativa de atualizar marca com slug duplicado', {
          slug: data.slug,
          brandId: id,
        });
        throw new AppError('Já existe uma marca com este slug', HTTP_STATUS.BAD_REQUEST);
      }
    }

    Object.assign(brand, data);

    const updatedBrand = await this.brandRepository.save(brand);

    log.info('Marca atualizada', {
      brandId: id,
      name: updatedBrand.name,
      slug: updatedBrand.slug,
    });

    return updatedBrand;
  }

  /**
   * Remove uma marca do sistema
   *
   * @param id - ID da marca a ser removida
   * @returns Mensagem de sucesso
   * @throws {AppError} 404 - Se a marca não for encontrada
   *
   * @example
   * await brandService.delete(1);
   */
  async delete(id: number) {
    const brand = await this.brandRepository.findOneBy({ id });
    if (!brand) {
      log.warn('Tentativa de deletar marca inexistente', { brandId: id });
      throw new AppError(ERROR_MESSAGES.BRAND_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    await this.brandRepository.remove(brand);

    log.info('Marca deletada', { brandId: id, brandName: brand.name });

    return { message: 'Marca deletada com sucesso' };
  }
}
