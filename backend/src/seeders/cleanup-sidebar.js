const ConfigModel = require('../app/models/configModel');
const { redis } = require('../util/cacheUtil');

const keysToRemove = [
  'sidebar-support-description',
  'sidebar-support-title',
  'sidebar-support-btn-text',
  'sidebar-support-btn-link',
  'sidebar-blog-btn-text',
  'sidebar-blog-btn-link'
];

async function run() {
  console.log('Cleaning up obsolete sidebar configs...');
  for (const key of keysToRemove) {
    const deletedCount = await ConfigModel.destroy({
      where: { key: key }
    });
    if (deletedCount > 0) {
      console.log(`Deleted config key: ${key}`);
    } else {
      console.log(`Key not found or already deleted: ${key}`);
    }
  }
  // Clear redis cache
  await redis.del('configs:v2');
  console.log('Redis cache cleared!');
  process.exit(0);
}

run().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
