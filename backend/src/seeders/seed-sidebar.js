const ConfigModel = require('../app/models/configModel');
const { redis } = require('../util/cacheUtil');

const defaultConfigs = [];

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
