import { AppDataSource } from '../../data-source';
import { Product } from '../entities/Product';

export class ProductService {
    private productRepository = AppDataSource.getRepository(Product);

    async getAll() {
        return this.productRepository.find();
    }

    async create(productData: Partial<Product>) {
        const product = this.productRepository.create(productData);
        return this.productRepository.save(product);
    }

    async getOne(id: string) {
        return this.productRepository.findOneBy({ id });
    }
}
