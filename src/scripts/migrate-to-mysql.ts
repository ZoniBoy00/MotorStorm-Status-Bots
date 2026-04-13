import { runMigration } from '../utils/migration';
import { Logger } from '../utils/logger';

const logger = new Logger('MigrationManual');

async function main() {
    logger.info('Starting manual migration...');
    await runMigration();
    logger.success('Manual migration process finished');
    process.exit(0);
}

main().catch(err => {
    logger.error('Manual migration failed:', err);
    process.exit(1);
});
