import { AppDataSource } from '../../data-source';
import { Wishlist } from '../entities/Wishlist';
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { AppError } from '../middlewares/errorHandler';

export class WishlistService {
    private wishlistRepository = AppDataSource.getRepository(Wishlist);
    private productRepository = AppDataSource.getRepository(Product);
    private userRepository = AppDataSource.getRepository(User);

    async getWishlist(userId: string) {
        return this.wishlistRepository.find({
            where: { user: { id: userId } },
            relations: ['product', 'product.images'],
            order: { added_at: 'DESC' }
        });
    }

    async addToWishlist(userId: string, productId: string) {
        const product = await this.productRepository.findOne({ where: { id: productId } });
        if (!product) {
            throw new AppError('Product not found', 404);
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Check if already in wishlist
        const exists = await this.wishlistRepository.findOne({
            where: {
                user: { id: userId },
                product: { id: productId }
            }
        });

        if (exists) {
            return exists; // Already added
        }

        const wishlistItem = this.wishlistRepository.create({
            user,
            product
        });

        return this.wishlistRepository.save(wishlistItem);
    }

    async removeFromWishlist(userId: string, wishlistItemId: string) {
        const item = await this.wishlistRepository.findOne({
            where: { id: wishlistItemId, user: { id: userId } }
        });

        if (!item) {
            throw new AppError('Wishlist item not found', 404);
        }

        await this.wishlistRepository.remove(item);
    }
}
