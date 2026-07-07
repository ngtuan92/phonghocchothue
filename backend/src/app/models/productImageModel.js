const db = require('../../config/db');
const {DataTypes} = require("sequelize");
const productModel = require("./productModel");

const ProductImageModel = db.sequelize.define("product_image", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    image_detail: { type: DataTypes.STRING, maxLength: 255 },
    product_id: { type: DataTypes.INTEGER }
}, {
    timestamps: true,
});

ProductImageModel.belongsTo(productModel, {
    foreignKey: 'product_id', // Foreign key in ProductImageModel
    targetKey: 'id', // Primary key in ProductModel
    as: 'products', // Add an alias
});

productModel.hasMany(ProductImageModel, {
    foreignKey: 'product_id', // Tên cột khóa ngoại trong bảng `product_image`
    as: 'images', // Alias để sử dụng trong include
});

module.exports = ProductImageModel