import { AppDataSource } from '../../data-source';
import { UserAddress } from '../entities/UserAddress';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';

interface AddressData {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

export class AddressService {
    private addressRepository = AppDataSource.getRepository(UserAddress);
    private userRepository = AppDataSource.getRepository(User);

    async list(userId: string) {
        return this.addressRepository.find({
            where: { user: { id: userId } }
        });
    }

    async create(userId: string, data: AddressData) {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new AppError('Usuário não encontrado', 404);
        }

        const address = this.addressRepository.create({
            user,
            street: data.street,
            city: data.city,
            state: data.state,
            zip_code: data.zipCode,
            country: data.country
        });

        return this.addressRepository.save(address);
    }

    async delete(userId: string, addressId: string) {
        const address = await this.addressRepository.findOne({
            where: { id: addressId },
            relations: ['user']
        });

        if (!address) {
            throw new AppError('Endereço não encontrado', 404);
        }

        if (address.user.id !== userId) {
            throw new AppError('Acesso negado ao endereço', 403);
        }

        await this.addressRepository.remove(address);
        return { message: 'Endereço removido com sucesso' };
    }
}
