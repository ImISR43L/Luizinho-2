
import { execSync } from 'child_process';

export default async () => {
  console.log('\n🚀 Setting up the E2E test environment...');


  const buildCommand = 'pnpm build';
  const migrateCommand =
    'dotenv -e test.env -- pnpm prisma migrate reset --force';

  try {

    console.log('Compiling project...');
    execSync(buildCommand, { stdio: 'inherit' });
    console.log('Compilation complete.');


    console.log('Resetting test database...');
    execSync(migrateCommand, { stdio: 'inherit' });
    console.log('✅ Test database reset successfully.');
  } catch (error) {
    console.error('❌ Failed to set up the test database.');
    console.error(error);
    process.exit(1);
  }
};
