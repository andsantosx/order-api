import { AppDataSource } from '../../data-source';
import { Wishlist } from '../entities/Wishlist';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';
import { log } from '../../config/logger';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../constants';

/**
 * Service responsável pela gestão de listas de desejos
 *
 * Funcionalidades:
 * - Listar produtos favoritos do usuário
 * - Adicionar produtos à wishlist
 * - Remover produtos da wishlist
 * - Validação de duplicatas
 *
 * Cada usuário pode ter múltiplos produtos na wishlist
 */
export class WishlistService {
  private wishlistRepository = AppDataSource.getRepository(Wishlist);
  private productRepository = AppDataSource.getRepository(Product);
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Retorna todos os produtos na wishlist do usuário
   *
   * Produtos são retornados ordenados por data de adição (mais recentes primeiro)
   * Inclui informações completas do produto e suas imagens
   *
   * @param userId - ID do usuário
   * @returns Lista de items na wishlist com produtos e imagens
   *
   * @example
   * const wishlist = await wishlistService.getWishlist(userId);
   * // [
   * //   { id: 'uuid', product: { name: 'Produto X', ... }, added_at: Date },
   * //   ...
   * // ]
   */
  async getWishlist(userId: string) {
    log.info('Buscando wishlist do usuário', { userId });

    const wishlist = await this.wishlistRepository.find({
      where: { user: { id: userId } },
      relations: ['product', 'product.images', 'product.category', 'product.brand'],
      order: { added_at: 'DESC' },
    });

    log.info('Wishlist consultada', { userId, itemCount: wishlist.length });
    return wishlist;
  }

  /**
   * Adiciona um produto à wishlist do usuário
   *
   * Validações:
   * - Produto deve existir
   * - Usuário deve existir
   * - Não adiciona duplicatas (retorna item existente)
   *
   * @param userId - ID do usuário
   * @param productId - ID do produto a adicionar
   * @returns Item da wishlist criado ou existente
   * @throws {AppError} 404 - Se produto ou usuário não encontrado
   *
   * @example
   * const item = await wishlistService.addToWishlist(userId, productId);
   */
  async addToWishlist(userId: string, productId: string) {
    // Valida produto
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      log.warn('Tentativa de adicionar produto inexistente à wishlist', { userId, productId });
      throw new AppError(ERROR_MESSAGES.PRODUCT_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Valida usuário
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      log.warn('Usuário não encontrado ao adicionar à wishlist', { userId });
      throw new AppError(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    // Verifica duplicata
    const exists = await this.wishlistRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: productId },
      },
    });

    if (exists) {
      log.info('Produto já está na wishlist', { userId, productId });
      return exists; // Idempotente
    }

    // Cria novo item
    const wishlistItem = this.wishlistRepository.create({
      user,
      product,
    });

    const saved = await this.wishlistRepository.save(wishlistItem);

    log.info('Produto adicionado à wishlist', {
      userId,
      productId,
      productName: product.name,
      wishlistItemId: saved.id,
    });

    return saved;
  }

  /**
   * Remove um produto da wishlist do usuário
   *
   * Validações:
   * - Item deve existir
   * - Item deve pertencer ao usuário (segurança)
   *
   * @param userId - ID do usuário
   * @param wishlistItemId - ID do item na wishlist a remover
   * @returns void
   * @throws {AppError} 404 - Se item não encontrado ou não pertence ao usuário
   *
   * @example
   * await wishlistService.removeFromWishlist(userId, wishlistItemId);
   */
  async removeFromWishlist(userId: string, wishlistItemId: string) {
    const item = await this.wishlistRepository.findOne({
      where: { id: wishlistItemId, user: { id: userId } },
      relations: ['product'],
    });

    if (!item) {
      log.warn('Tentativa de remover item inexistente ou não autorizado', {
        userId,
        wishlistItemId,
      });
      throw new AppError('Item não encontrado na wishlist', HTTP_STATUS.NOT_FOUND);
    }

    await this.wishlistRepository.remove(item);

    log.info('Produto removido da wishlist', {
      userId,
      wishlistItemId,
      productId: item.product.id,
      productName: item.product.name,
    });

    return { message: 'Produto removido da wishlist com sucesso' };
  }
}
