import { AppDataSource } from '../../data-source';
import { seedDatabase } from './seeder';
import { log } from '../../config/logger';

async function runDevSeed() {
  try {
    await seedDatabase(AppDataSource);
    log.info('✅ Dev database seeded successfully!');
    process.exit(0);
  } catch (error: unknown) {
    const err = error as Error;
    log.error('❌ Dev database seeding failed:', {
      message: err.message,
      stack: err.stack,
      error,
    });
    process.exit(1);
  }
}

runDevSeed();
