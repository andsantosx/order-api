import { AppDataSource } from '../../data-source';
import { Brand } from '../entities/Brand';
import { AppError } from '../middlewares/errorHandler';

export class BrandService {
    private brandRepository = AppDataSource.getRepository(Brand);

    /**
     * Retorna todas as marcas ordenadas por nome.
     */
    async getAll() {
        return this.brandRepository.find({
            relations: ['products'],
            order: { name: 'ASC' }
        });
    }

    /**
     * Busca uma marca pelo ID.
     */
    async getOne(id: number) {
        const brand = await this.brandRepository.findOne({
            where: { id },
            relations: ['products']
        });

        if (!brand) {
            throw new AppError('Marca não encontrada', 404);
        }

        return brand;
    }

    /**
     * Busca uma marca pelo slug.
     */
    async getBySlug(slug: string) {
        const brand = await this.brandRepository.findOne({
            where: { slug },
            relations: ['products']
        });

        if (!brand) {
            throw new AppError('Marca não encontrada', 404);
        }

        return brand;
    }

    /**
     * Cria uma nova marca.
     * Verifica se o slug já existe.
     */
    async create(name: string, slug: string) {
        const existingBrand = await this.brandRepository.findOneBy({ slug });
        if (existingBrand) {
            throw new AppError('Já existe uma marca com este slug', 400);
        }

        const brand = this.brandRepository.create({ name, slug });
        return this.brandRepository.save(brand);
    }

    /**
     * Atualiza uma marca.
     * Verifica duplicidade de slug se ele for alterado.
     */
    async update(id: number, name: string, slug: string) {
        const brand = await this.brandRepository.findOneBy({ id });
        if (!brand) {
            throw new AppError('Marca não encontrada', 404);
        }

        if (slug !== brand.slug) {
            const existingBrand = await this.brandRepository.findOneBy({ slug });
            if (existingBrand) {
                throw new AppError('Já existe uma marca com este slug', 400);
            }
        }

        brand.name = name;
        brand.slug = slug;

        return this.brandRepository.save(brand);
    }

    /**
     * Remove uma marca.
     */
    async delete(id: number) {
        const brand = await this.brandRepository.findOneBy({ id });
        if (!brand) {
            throw new AppError('Marca não encontrada', 404);
        }

        await this.brandRepository.remove(brand);
        return { message: 'Marca deletada com sucesso' };
    }
}
