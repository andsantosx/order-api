import { AppDataSource } from '../../data-source';
import { UserAddress } from '../entities/UserAddress';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';
import { log } from '../../config/logger';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../constants';
import { sanitizeAddressData, isValidZipCode } from '../../utils/sanitizer';

/**
 * Interface para dados de endereço
 */
export interface AddressData {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

/**
 * Service responsável pela gestão de endereços de usuários
 * 
 * Funcionalidades:
 * - Listar endereços salvos do usuário
 * - Criar novos endereços com validação
 * - Remover endereços com verificação de ownership
 * - Sanitização de dados de endereço
 * 
 * Validações:
 * - CEP obrigatório e no format correto
 * - Ownership verification (usuário só acessa seus próprios endereços)
 * - Sanitização contra XSS
 */
export class AddressService {
    private addressRepository = AppDataSource.getRepository(UserAddress);
    private userRepository = AppDataSource.getRepository(User);

    /**
     * Lista todos os endereços salvos do usuário
     * 
     * @param userId - ID do usuário
     * @returns Array de endereços do usuário
     * 
     * @example
     * const addresses = await addressService.list(userId);
     * // [
     * //   { id: 'uuid', street: 'Rua X', city: 'São Paulo', ... },
     * //   ...
     * // ]
     */
    async list(userId: string) {
        log.info('Listando endereços do usuário', { userId });

        const addresses = await this.addressRepository.find({
            where: { user: { id: userId } }
        });

        log.info('Endereços consultados', { userId, count: addresses.length });
        return addresses;
    }

    /**
     * Cria um novo endereço para o usuário
     * 
     * Validações aplicadas:
     * - Usuário deve existir
     * - CEP é obrigatório e deve estar no formato válido (12345-678 ou 12345678)
     * - Sanitização de todos os campos (remove HTML/scripts)
     * 
     * @param userId - ID do usuário
     * @param data - Dados do endereço
     * @returns Endereço created
     * @throws {AppError} 404 - Se usuário não encontrado
     * @throws {AppError} 400 - Se CEP inválido ou faltando
     * 
     * @example
     * const address = await addressService.create(userId, {
     *   street: 'Rua das Flores, 123',
     *   city: 'São Paulo',
     *   state: 'SP',
     *   zipCode: '01234-567',
     *   country: 'Brasil'
     * });
     */
    async create(userId: string, data: AddressData) {
        // Valida usuário
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            log.warn('Tentativa de criar endereço para usuário inexistente', { userId });
            throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }

        // Valida CEP
        if (!data.zipCode) {
            throw new AppError('CEP é obrigatório', HTTP_STATUS.BAD_REQUEST);
        }

        if (!isValidZipCode(data.zipCode)) {
            log.warn('CEP em formato inválido', { userId, zipCode: data.zipCode });
            throw new AppError(
                'CEP inválido. Use o formato: 12345-678 ou 12345678',
                HTTP_STATUS.BAD_REQUEST
            );
        }

        // Sanitiza dados
        const sanitized = sanitizeAddressData(data);

        // Cria endereço
        const address = this.addressRepository.create({
            user,
            street: sanitized.street,
            city: sanitized.city,
            state: sanitized.state,
            zip_code: sanitized.zipCode,
            country: sanitized.country
        });

        const saved = await this.addressRepository.save(address);

        log.info('Novo endereço criado', {
            userId,
            addressId: saved.id,
            city: saved.city,
            state: saved.state
        });

        return saved;
    }

    /**
     * Remove um endereço do usuário
     * 
     * Validações de segurança:
     * - Endereço deve existir
     * - Endereço deve pertencer ao usuário (ownership check)
     * 
     * @param userId - ID do usuário
     * @param addressId - ID do endereço a remover
     * @returns Mensagem de sucesso
     * @throws {AppError} 404 - Se endereço não encontrado
     * @throws {AppError} 403 - Se endereço não pertence ao usuário
     * 
     * @example
     * await addressService.delete(userId, addressId);
     */
    async delete(userId: string, addressId: string) {
        const address = await this.addressRepository.findOne({
            where: { id: addressId },
            relations: ['user']
        });

        if (!address) {
            log.warn('Tentativa de deletar endereço inexistente', { userId, addressId });
            throw new AppError('Endereço não encontrado', HTTP_STATUS.NOT_FOUND);
        }

        // Ownership verification (segurança crítica!)
        if (address.user.id !== userId) {
            log.warn('Tentativa de acesso não autorizado a endereço', {
                userId,
                addressId,
                ownerId: address.user.id
            });
            throw new AppError(
                'Acesso negado: este endereço pertence a outro usuário',
                HTTP_STATUS.FORBIDDEN
            );
        }

        await this.addressRepository.remove(address);

        log.info('Endereço removido', {
            userId,
            addressId,
            city: address.city
        });

        return { message: 'Endereço removido com sucesso' };
    }
}
