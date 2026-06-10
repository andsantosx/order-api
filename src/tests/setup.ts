import { TestDataSource } from './test-data-source';
import { DataSource } from 'typeorm';

jest.setTimeout(60000); // 60 seconds for remote DB setup operations

beforeAll(async () => {
  // 1. Create database if it doesn't exist
  // We connect to 'postgres' database first to run the CREATE DATABASE command
  const setupDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default DB
    synchronize: false,
  });

  try {
    await setupDataSource.initialize();
    const dbCheck = await setupDataSource.query(
      "SELECT 1 FROM pg_database WHERE datname = 'order_db_test'",
    );

    if (dbCheck.length === 0) {
      // Database doesn't exist, create it
      // Note: CREATE DATABASE cannot be run inside a transaction
      await setupDataSource.query('CREATE DATABASE order_db_test');
    }
    await setupDataSource.destroy();
  } catch (error) {
    console.error('Error during test database setup:', error);
    if (setupDataSource.isInitialized) await setupDataSource.destroy();
  }

  // 2. Initialize the TestDataSource
  if (!TestDataSource.isInitialized) {
    await TestDataSource.initialize();
  }

  // 3. Manual table reset to ensure a clean state without dropping extensions
  try {
    // Ensure we are in the public schema and uuid-ossp exists
    await TestDataSource.query('SET search_path TO public;');
    await TestDataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;');

    // SHIM: If uuid_generate_v4() is missing but gen_random_uuid() is available, create a shim
    // This happens in some modern Postgres environments where uuid-ossp is installed but doesn't provide the function
    await TestDataSource.query(`
      CREATE OR REPLACE FUNCTION uuid_generate_v4() RETURNS uuid AS $$
      BEGIN
        RETURN gen_random_uuid();
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Verify shim is working
    await TestDataSource.query('SELECT uuid_generate_v4() as uuid');

    // Drop all tables and types in the public schema without dropping the schema itself or its extensions
    await TestDataSource.query(`
      DO $$ DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
          FOR r IN (SELECT typname FROM pg_type JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace WHERE nspname = 'public' AND typtype = 'e') LOOP
              EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
          END LOOP;
      END $$;
    `);

    // Synchronize the schema (create all tables)
    await TestDataSource.synchronize();

    // 4. Seed Database for Tests
    // This ensures every test run starts with a populated database
    const { seedDatabase } = await import('./seed/seeder'); // Dynamic import to avoid circular dep issues in some envs
    await seedDatabase(TestDataSource);
  } catch (error) {
    console.error('CRITICAL: Schema synchronization or seeding failed:', error);
    throw error; // Fail the tests if we can't sync or seed
  }
});

afterAll(async () => {
  if (TestDataSource.isInitialized) {
    await TestDataSource.destroy();
  }
});
