
import { AppDataSource } from './data-source';
import { Product } from './api/entities/Product';
import { Size } from './api/entities/Size';
import { ProductSize } from './api/entities/ProductSize';
import { OrderService } from './api/services/OrderService';
import { User } from './api/entities/User';
import { Category } from './api/entities/Category';

async function verify() {
    console.log('🚀 Starting verification...');

    await AppDataSource.initialize();
    console.log('✅ DB Connected');

    const productService = AppDataSource.getRepository(Product);
    const sizeRepo = AppDataSource.getRepository(Size);
    const categoryRepo = AppDataSource.getRepository(Category);

    try {
        // 1. Setup Data
        let size = await sizeRepo.findOneBy({ name: 'TEST-SIZE' });
        if (!size) {
            size = sizeRepo.create({ name: 'TEST-SIZE', type: 'clothing' });
            await sizeRepo.save(size);
        }

        let category = await categoryRepo.findOneBy({ name: 'TestCat' });
        if (!category) {
            category = categoryRepo.create({ name: 'TestCat', slug: 'test-cat' });
            await categoryRepo.save(category);
        }

        // 2. Create Product (Without Quantity logic)
        // Manually creating using repo to bypass Controller logic for now, or we can use Service.
        // Let's use repo to emulate what Service does now.
        const product = productService.create({
            name: 'Test Product ' + Date.now(),
            price_cents: 1000,
            currency: 'BRL',
            category: category,
        });
        await productService.save(product);

        // Create ProductSize using repo - ensure NO quantity issue
        const productSizeRepo = AppDataSource.getRepository(ProductSize);
        const ps = productSizeRepo.create({
            product: product,
            size: size
            // quantity: 0  <-- This should NOT exist or be needed. If TypeORM errors here, we failed.
        });
        await productSizeRepo.save(ps);
        console.log('✅ Product and ProductSize created (No quantity column check)');

        // 3. Create Order
        const orderService = new OrderService();
        console.log('🛒 Creating Order...');

        const order = await orderService.create(
            undefined, // userId
            'Test Guest',
            'guest@test.com',
            undefined,
            [
                { productId: product.id, quantity: 1, size: 'TEST-SIZE' }
            ],
            {
                street: 'Test St',
                city: 'Test City',
                state: 'TS',
                zipCode: '12345678',
                country: 'BR'
            }
        );

        console.log('✅ Order created with ID:', order.id);

        // 4. Verify Order Item Size
        if (order.items && order.items.length > 0) {
            const item = order.items[0];
            console.log(`📦 Item Size: ${item.size}`);

            if (item.size === 'TEST-SIZE') {
                console.log('✅ VERIFICATION PASSED: Size persisted correctly.');
            } else {
                console.error('❌ VERIFICATION FAILED: Size NOT persisted.');
                process.exit(1);
            }
        } else {
            console.error('❌ VERIFICATION FAILED: No items in order.');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error during verification:', error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
    }
}

verify();
