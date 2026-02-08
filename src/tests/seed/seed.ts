import { AppDataSource } from '../../data-source';
import { seedDatabase } from './seeder';

async function runSeed() {
  try {
    await seedDatabase(AppDataSource);
    console.log('✅ Main database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Main database seeding failed:', error);
    process.exit(1);
  }
}

runSeed();
