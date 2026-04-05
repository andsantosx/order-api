import { DataSource } from 'typeorm';
import { Category } from '../../api/entities/Category';
import { Size } from '../../api/entities/Size';
import { User } from '../../api/entities/User';
import { Brand } from '../../api/entities/Brand';
import { Product } from '../../api/entities/Product';
import { ProductImage } from '../../api/entities/ProductImage';
import { ProductSize } from '../../api/entities/ProductSize';
import bcrypt from 'bcryptjs';
import { log } from '../../config/logger';

export async function seedDatabase(dataSource: DataSource) {
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    log.info(`✅ Connected to database: ${dataSource.options.database}`);

    const categoryRepo = dataSource.getRepository(Category);
    const sizeRepo = dataSource.getRepository(Size);
    const userRepo = dataSource.getRepository(User);
    const brandRepo = dataSource.getRepository(Brand);
    const productRepo = dataSource.getRepository(Product);
    const imageRepo = dataSource.getRepository(ProductImage);
    const productSizeRepo = dataSource.getRepository(ProductSize);

    // 1. Seed Categories
    const categories = [
      { name: 'Camisetas', slug: 'camisetas' },
      { name: 'Calças', slug: 'calcas' },
      { name: 'Sapatos', slug: 'sapatos' },
      { name: 'Acessórios', slug: 'acessorios' },
    ];

    const categoryMap = new Map<string, Category>();

    for (const cat of categories) {
      let category = await categoryRepo.findOneBy({ slug: cat.slug });
      if (!category) {
        category = await categoryRepo.save(categoryRepo.create(cat));
        log.info(`Created category: ${cat.name}`);
      }
      categoryMap.set(cat.slug, category);
    }

    // 2. Seed Sizes
    const sizes = [
      { name: 'P', type: 'clothing' },
      { name: 'M', type: 'clothing' },
      { name: 'G', type: 'clothing' },
      { name: 'GG', type: 'clothing' },
      { name: '38', type: 'shoes' },
      { name: '39', type: 'shoes' },
      { name: '40', type: 'shoes' },
      { name: '41', type: 'shoes' },
      { name: '42', type: 'shoes' },
    ];

    const sizeMap = new Map<string, Size>();

    for (const size of sizes) {
      let sizeEntity = await sizeRepo.findOneBy({ name: size.name });
      if (!sizeEntity) {
        sizeEntity = await sizeRepo.save(sizeRepo.create(size));
        log.info(`Created size: ${size.name}`);
      }
      sizeMap.set(size.name, sizeEntity);
    }

    // 3. Seed Users (Admin & Customer)
    const users = [
      {
        name: 'Admin User',
        email: 'admin@admin.com',
        password: 'admin123',
        isAdmin: true,
        phone: '11999997777',
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        isAdmin: false,
        phone: '11999998880',
      },
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        isAdmin: false,
        phone: '11999998881',
      },
    ];

    for (const userData of users) {
      const exists = await userRepo.findOneBy({ email: userData.email });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(userData.password, 8);
        await userRepo.save(
          userRepo.create({
            name: userData.name,
            email: userData.email,
            passwordHash: hashedPassword,
            isAdmin: userData.isAdmin,
            phone: userData.phone,
            acceptedTerms: true,
          }),
        );
        log.info(`Created User: ${userData.email}`);
      } else {
        if (userData.isAdmin && !exists.isAdmin) {
          exists.isAdmin = true;
          await userRepo.save(exists);
          log.info(`Updated User: ${userData.email} to Admin`);
        }
      }
    }

    // 4. Seed Brands
    const brands = [
      { name: 'Nike', slug: 'nike' },
      { name: 'Adidas', slug: 'adidas' },
      { name: 'Puma', slug: 'puma' },
      { name: 'Zara', slug: 'zara' },
    ];

    const brandMap = new Map<string, Brand>();

    for (const brandData of brands) {
      let brand = await brandRepo.findOneBy({ slug: brandData.slug });
      if (!brand) {
        brand = await brandRepo.save(brandRepo.create(brandData));
        log.info(`Created Brand: ${brand.name}`);
      }
      brandMap.set(brand.slug, brand);
    }

    // 5. Seed Products
    // We'll create a few products linking to the above
    const productsData = [
      {
        name: 'Nike Air Force 1',
        priceCents: 89900,
        description: 'Clássico atemporal.',
        currency: 'BRL',
        categorySlug: 'sapatos',
        brandSlug: 'nike',
        images: ['https://imgnike-a.akamaihd.net/768x768/01113751.jpg'],
        sizes: ['38', '39', '40', '41', '42'],
      },
      {
        name: 'Adidas Superstar',
        priceCents: 69990,
        description: 'O tênis da biqueira em concha.',
        currency: 'BRL',
        categorySlug: 'sapatos',
        brandSlug: 'adidas',
        images: [
          'https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/7ed0855435194229a525aad6009a0497_9366/Tenis_Superstar_Branco_EG4958_01_standard.jpg',
        ],
        sizes: ['39', '40', '41'],
      },
      {
        name: 'Camiseta Basic Cotton',
        priceCents: 7990,
        description: '100% Algodão.',
        currency: 'BRL',
        categorySlug: 'camisetas',
        brandSlug: 'zara',
        images: [
          'https://static.zara.net/photos///2023/I/0/2/p/0679/302/250/2/w/563/0679302250_6_1_1.jpg?ts=1688034503789',
        ],
        sizes: ['P', 'M', 'G', 'GG'],
      },
    ];

    for (const prodData of productsData) {
      // Check if product exists by name (simplified)
      const exists = await productRepo.findOneBy({ name: prodData.name });
      if (!exists) {
        const category = categoryMap.get(prodData.categorySlug);
        const brand = brandMap.get(prodData.brandSlug);

        if (!category) {
          log.warn(`Category not found for product ${prodData.name}: ${prodData.categorySlug}`);
          continue;
        }

        const product = productRepo.create({
          name: prodData.name,
          priceCents: prodData.priceCents,
          description: prodData.description,
          currency: prodData.currency,
          category: category,
          brand: brand || null,
        });

        const savedProduct = await productRepo.save(product);
        log.info(`Created Product: ${savedProduct.name}`);

        // Images
        for (const imageUrl of prodData.images) {
          await imageRepo.save(
            imageRepo.create({
              product: savedProduct,
              url: imageUrl,
            }),
          );
        }

        // Sizes
        for (const sizeName of prodData.sizes) {
          const size = sizeMap.get(sizeName);
          if (size) {
            // Check if product_size relation exists (it shouldn't for new product but good practice)
            const psExists = await productSizeRepo.findOneBy({
              product: { id: savedProduct.id },
              size: { id: size.id },
            });

            if (!psExists) {
              await productSizeRepo.save(
                productSizeRepo.create({
                  product: savedProduct,
                  size: size,
                }),
              );
            }
          }
        }
      }
    }

    log.info('✅ Seeding logic completed!');
  } catch (error) {
    log.error('❌ Seeding failed:', { error });
    throw error;
  }
}
