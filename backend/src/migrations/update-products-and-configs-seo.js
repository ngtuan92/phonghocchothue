const path = require('path');
const db = require("../config/db");
const ProductModel = require("../app/models/productModel");
const ConfigModel = require("../app/models/configModel");
const redis = require("../config/redis");

function formatProductRichName(nameRich) {
  if (!nameRich || typeof nameRich !== 'string') return nameRich;
  return nameRich
    .replace(/<h[1-6](\s[^>]*?)?>/gi, (match, attrs) => {
      return `<div class="product-title-heading"${attrs || ''}>`;
    })
    .replace(/<\/h[1-6]>/gi, '</div>');
}

(async () => {
  try {
    console.log("Starting DB SEO Migration...");
    
    // 1. Update product name_rich fields
    const products = await ProductModel.findAll();
    console.log(`Found ${products.length} products.`);
    
    for (const product of products) {
      if (product.name_rich) {
        const original = product.name_rich;
        const updated = formatProductRichName(original);
        if (original !== updated) {
          console.log(`Updating product ${product.id} (${product.name}):`);
          console.log(`  Before: ${original}`);
          console.log(`  After:  ${updated}`);
          await product.update({ name_rich: updated });
        }
      }
    }
    
    // 2. Update blog-heading configuration
    const blogHeadingKey = 'blog-heading';
    const blogHeading = await ConfigModel.findOne({ where: { key: blogHeadingKey } });
    if (blogHeading) {
      const newContent = '<h2><span style="font-size: 2.5rem;">Ký&nbsp;ức&nbsp;thanh&nbsp;xuân&nbsp;và&nbsp;kinh&nbsp;nghiệm&nbsp;học&nbsp;đường</span></h2>';
      console.log(`Updating config ${blogHeadingKey}:`);
      console.log(`  Before: ${blogHeading.content}`);
      console.log(`  After:  ${newContent}`);
      await blogHeading.update({ content: newContent });
    } else {
      console.log(`Config ${blogHeadingKey} not found.`);
    }

    // 3. Clear cache
    console.log("Clearing Redis Cache...");
    await redis.del('configs:v2');
    await redis.del('products:all');
    
    const keys = await redis.keys('product:detail:*');
    if (keys.length > 0) {
      await redis.del(keys);
    }
    
    const limitKeys = await redis.keys('products:limit:*');
    if (limitKeys.length > 0) {
      await redis.del(limitKeys);
    }

    console.log("DB SEO Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("DB SEO Migration failed:", error);
    process.exit(1);
  }
})();
