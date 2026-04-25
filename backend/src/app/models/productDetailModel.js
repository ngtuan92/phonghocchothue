const db = require('../../config/db');
const { DataTypes } = require("sequelize");
const ProductModel = require("./productModel");

const ProductDetailModel = db.sequelize.define("product_details", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    key: { type: DataTypes.STRING, maxLength: 255, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: true },
}, {
    timestamps: true,
});

ProductDetailModel.belongsTo(ProductModel, {
    foreignKey: 'product_id',
    as: 'product',
});

ProductModel.hasMany(ProductDetailModel, {
    foreignKey: 'product_id',
    as: 'details',
});

module.exports = ProductDetailModel;
