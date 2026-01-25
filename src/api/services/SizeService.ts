import { AppDataSource } from '../../data-source';
import { Size } from '../entities/Size';
import { AppError } from '../middlewares/errorHandler';

export class SizeService {
    private sizeRepository = AppDataSource.getRepository(Size);

    async getAll(type?: string) {
        const where = type ? { type } : {};
        return this.sizeRepository.find({
            where,
            order: { name: 'ASC' }
        });
    }

    async getOne(id: string) {
        const size = await this.sizeRepository.findOneBy({ id });
        if (!size) {
            throw new AppError('Tamanho não encontrado', 404);
        }
        return size;
    }

    async create(name: string, type: string) {
        const size = this.sizeRepository.create({ name, type });
        return this.sizeRepository.save(size);
    }

    async delete(id: string) {
        const size = await this.sizeRepository.findOneBy({ id });
        if (!size) {
            throw new AppError('Tamanho não encontrado', 404);
        }

        await this.sizeRepository.remove(size);
        return { message: 'Tamanho deletado com sucesso' };
    }
}
