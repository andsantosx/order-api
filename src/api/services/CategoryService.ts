import { AppDataSource } from '../../data-source';
import { Category } from '../entities/Category';
import { AppError } from '../middlewares/errorHandler';

export class CategoryService {
    private categoryRepository = AppDataSource.getRepository(Category);

    async getAll() {
        return this.categoryRepository.find({
            relations: ['products'],
            order: { name: 'ASC' }
        });
    }

    async getOne(id: string) {
        const category = await this.categoryRepository.findOne({
            where: { id },
            relations: ['products']
        });

        if (!category) {
            throw new AppError('Category not found', 404);
        }

        return category;
    }

    async getBySlug(slug: string) {
        const category = await this.categoryRepository.findOne({
            where: { slug },
            relations: ['products']
        });

        if (!category) {
            throw new AppError('Category not found', 404);
        }

        return category;
    }

    async create(name: string, slug: string) {
        const existingCategory = await this.categoryRepository.findOneBy({ slug });
        if (existingCategory) {
            throw new AppError('Category with this slug already exists', 400);
        }

        const category = this.categoryRepository.create({ name, slug });
        return this.categoryRepository.save(category);
    }

    async update(id: string, name: string, slug: string) {
        const category = await this.categoryRepository.findOneBy({ id });
        if (!category) {
            throw new AppError('Category not found', 404);
        }

        // Check if slug is being changed and if it conflicts
        if (slug !== category.slug) {
            const existingCategory = await this.categoryRepository.findOneBy({ slug });
            if (existingCategory) {
                throw new AppError('Category with this slug already exists', 400);
            }
        }

        category.name = name;
        category.slug = slug;

        return this.categoryRepository.save(category);
    }

    async delete(id: string) {
        const category = await this.categoryRepository.findOneBy({ id });
        if (!category) {
            throw new AppError('Category not found', 404);
        }

        await this.categoryRepository.remove(category);
        return { message: 'Category deleted successfully' };
    }
}
