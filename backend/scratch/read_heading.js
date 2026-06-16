const ConfigModel = require('../src/app/models/configModel');
const db = require('../src/config/db');

async function run() {
  try {
    const configs = await ConfigModel.findAll({
      where: {
        key: ['describe-heading', 'describe-bg-text', 'describe-frame-image', 'describe-frame-image-mobile', 'seo-h1-main']
      }
    });
    for (const c of configs) {
      console.log('--- KEY:', c.key);
      console.log('Content:', JSON.stringify(c.content));
      console.log('lineHeight:', c.lineHeight);
      console.log('lineHeightMobile:', c.lineHeightMobile);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await db.sequelize.close();
  }
}

run();
