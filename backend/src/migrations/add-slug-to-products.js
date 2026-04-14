/**
 * Migration script để thêm column slug vào bảng products
 * Chạy script này một lần để thêm column slug vào database
 * 
 * Cách chạy:
 * node src/migrations/add-slug-to-products.js
 */

const db = require('../config/db');
const { Sequelize, DataTypes } = require('sequelize');
const { createSlug } = require('../util/slug');
const productModel = require('../app/models/productModel');

async function addSlugColumn() {
  try {
    console.log('Bắt đầu migration...');

    const queryInterface = db.sequelize.getQueryInterface();
    
    // Kiểm tra xem column đã tồn tại chưa
    const tableDescription = await queryInterface.describeTable('products');
    if (tableDescription.slug) {
      console.log('Column slug đã tồn tại, bỏ qua việc thêm column...');
    } else {
      // Thêm column slug vào bảng products
      await queryInterface.addColumn('products', 'slug', {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
      console.log('Đã thêm column slug vào bảng products');
      
      // Thêm unique constraint (nếu cần)
      // Lưu ý: Có thể cần thêm index unique sau
    }

    // Tạo slug cho các sản phẩm đã có (nếu chưa có slug)
    const products = await productModel.findAll({
      where: {
        slug: null,
      },
    });

    console.log(`Tìm thấy ${products.length} sản phẩm chưa có slug`);

    for (const product of products) {
      if (product.name) {
        let slug = createSlug(product.name);
        let counter = 1;
        let uniqueSlug = slug;

        // Kiểm tra slug đã tồn tại chưa
        while (await productModel.findOne({ where: { slug: uniqueSlug } })) {
          uniqueSlug = `${slug}-${counter}`;
          counter++;
        }

        await product.update({ slug: uniqueSlug });
        console.log(`Đã tạo slug "${uniqueSlug}" cho sản phẩm: ${product.name}`);
      }
    }

    console.log('Migration hoàn thành!');
    process.exit(0);
  } catch (error) {
    console.error('Lỗi khi migration:', error);
    
    // Nếu column đã tồn tại, bỏ qua lỗi
    if (error.message && error.message.includes('Duplicate column name')) {
      console.log('Column slug đã tồn tại, bỏ qua...');
      process.exit(0);
    }
    
    process.exit(1);
  }
}

// Chạy migration
addSlugColumn();

