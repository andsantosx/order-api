import { TestDataSource } from '../test-data-source';
import { seedDatabase } from './seeder';
import { log } from '../../config/logger';

async function runTestSeed() {
  // We need to initialize the TestDataSource similarly to how setup.ts does it,
  // but without the teardown/rebuild of the database itself.
  // However, we probably want to clean the data before seeding?
  // For now, let's just seed idempotently (check if exists).

  try {
    // Ensure we can connect.
    // initialization is handled inside seedDatabase if not already initialized,
    // but TestDataSource needs correct config.
    // src/tests/test-data-source.ts has hardcoded config but relies on env vars too.

    await seedDatabase(TestDataSource);
    log.info('✅ Test database seeded successfully!');
    process.exit(0);
  } catch (error: unknown) {
    const err = error as Error;
    log.error('❌ Test database seeding failed:', {
      message: err.message,
      stack: err.stack,
      error,
    });
    process.exit(1);
  }
}

runTestSeed();
