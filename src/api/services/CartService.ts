import { AppDataSource } from '../../data-source';
import { CartItem } from '../entities/CartItem';
import { Product } from '../entities/Product';
import { executeInTransaction } from '../../utils/transaction';
import { log } from '../../config/logger';
import { injectable } from 'tsyringe';
import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';

export interface ISyncCartItem {
  productId: string;
  size: string;
  quantity: number;
  customName?: string;
  customNumber?: string;
}

@injectable()
export class CartService {
  private cartRepository = AppDataSource.getRepository(CartItem);
  private productRepository = AppDataSource.getRepository(Product);

  /**
   * Retorna os itens do carrinho do usuário, incluindo detalhes do produto
   */
  async getCart(userId: string): Promise<CartItem[]> {
    return this.cartRepository.find({
      where: { userId },
      relations: ['product', 'product.images', 'product.category', 'product.brand'],
    });
  }

  /**
   * Sincroniza o carrinho do frontend com a base de dados.
   * Substitui os itens atuais do banco pela nova lista enviada pelo cliente.
   */
  async syncCart(userId: string, items: ISyncCartItem[]): Promise<CartItem[]> {
    log.info(`[CartService] Sincronizando carrinho para o usuário ${userId}. Itens: ${items.length}`);

    // Valida se os produtos existem no banco
    if (items.length > 0) {
      const productIds = [...new Set(items.map((i) => i.productId))];
      const productsFound = await this.productRepository.findByIds(productIds);

      if (productsFound.length !== productIds.length) {
        log.warn(`[CartService] Um ou mais produtos inválidos na sincronização para o usuário ${userId}`);
        throw new AppError('Um ou mais produtos no carrinho são inválidos', HTTP_STATUS.BAD_REQUEST);
      }
    }

    return executeInTransaction(async (entityManager) => {
      const cartItemRepo = entityManager.getRepository(CartItem);

      // 1. Limpa o carrinho atual do banco
      await cartItemRepo.delete({ userId });

      if (items.length === 0) {
        return [];
      }

      // 2. Salva os novos itens recebidos do frontend
      const newCartItems = items.map((item) =>
        cartItemRepo.create({
          userId,
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          customName: item.customName || undefined,
          customNumber: item.customNumber || undefined,
        }),
      );

      const saved = await cartItemRepo.save(newCartItems);
      log.info(`[CartService] Sincronização concluída com sucesso para o usuário ${userId}`);
      return saved;
    });
  }

  /**
   * Limpa todo o carrinho de um usuário no banco (ex: após finalizar compra)
   */
  async clearCart(userId: string): Promise<void> {
    await this.cartRepository.delete({ userId });
    log.info(`[CartService] Carrinho limpo para usuário ${userId}`);
  }
}
