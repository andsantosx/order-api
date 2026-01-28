import { AppDataSource } from './data-source';
import { Category } from './api/entities/Category';
import { Size } from './api/entities/Size';
import { User } from './api/entities/User';
import bcrypt from 'bcryptjs';

async function seed() {
    try {
        await AppDataSource.initialize();
        console.log('✅ Connected to database');

        const categoryRepo = AppDataSource.getRepository(Category);
        const sizeRepo = AppDataSource.getRepository(Size);
        const userRepo = AppDataSource.getRepository(User);

        // 1. Seed Categories
        const categories = [
            { name: 'Camisetas', slug: 'camisetas' },
            { name: 'Calças', slug: 'calcas' },
            { name: 'Sapatos', slug: 'sapatos' },
            { name: 'Acessórios', slug: 'acessorios' },
        ];

        for (const cat of categories) {
            const exists = await categoryRepo.findOneBy({ slug: cat.slug });
            if (!exists) {
                await categoryRepo.save(categoryRepo.create(cat));
                console.log(`Created category: ${cat.name}`);
            }
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

        for (const size of sizes) {
            const exists = await sizeRepo.findOneBy({ name: size.name });
            if (!exists) {
                await sizeRepo.save(sizeRepo.create(size));
                console.log(`Created size: ${size.name}`);
            }
        }

        // 3. Seed Admin User
        const adminEmail = 'admin@admin.com';
        const adminExists = await userRepo.findOneBy({ email: adminEmail });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 8);
            await userRepo.save(userRepo.create({
                name: 'Admin User',
                email: adminEmail,
                password_hash: hashedPassword,
                isAdmin: true,
            }));
            console.log(`Created Admin User: ${adminEmail} / admin123`);
        } else {
            // Ensure existing admin is actually admin
            if (!adminExists.isAdmin) {
                adminExists.isAdmin = true;
                await userRepo.save(adminExists);
                console.log(`Updated existing user ${adminEmail} to be admin.`);
            }
        }

        console.log('✅ Seeding completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
