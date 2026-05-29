const ConfigModel = require('../app/models/configModel');
const { redis } = require('../util/cacheUtil');

const defaultConfigs = [
  {
    key: 'sidebar-blog-title',
    type: 'text',
    section: 'blog',
    content: 'Về Blog'
  },
  {
    key: 'sidebar-blog-description',
    type: 'richtext',
    section: 'blog',
    content: '<p>Nơi chia sẻ những bí quyết tối ưu không gian học tập và làm việc hiệu quả nhất.</p>'
  }
];

async function run() {
  console.log('Seeding sidebar configs...');
  for (const conf of defaultConfigs) {
    const [record, created] = await ConfigModel.findOrCreate({
      where: { key: conf.key },
      defaults: conf
    });
    if (created) {
      console.log(`Created config: ${conf.key}`);
    } else {
      // If config already exists but is empty or we want to ensure standard fields,
      // we don't overwrite if user has customized it.
      console.log(`Config already exists: ${conf.key}`);
    }
  }
  // Clear redis cache
  await redis.del('configs:v2');
  console.log('Redis cache cleared!');
  process.exit(0);
}

run().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
