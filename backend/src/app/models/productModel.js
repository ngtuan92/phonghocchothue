const db = require('../../config/db');
const {DataTypes} = require("sequelize");

const ProductModel = db.sequelize.define("products", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, maxLength: 255 },
    slug: { type: DataTypes.STRING, maxLength: 255, unique: true, allowNull: true },
    content: { type: DataTypes.TEXT },
    image: { type: DataTypes.STRING, maxLength: 255 },
    equipment: { type: DataTypes.STRING, maxLength: 255 },
    contains: { type: DataTypes.STRING, maxLength: 255 },
    description : { type: DataTypes.STRING, maxLength: 255 },
    price: { type: DataTypes.STRING, maxLength: 255 },
    unit: { type: DataTypes.STRING, maxLength: 50, allowNull: true, defaultValue: "buổi" },
    capacity: { type: DataTypes.STRING, maxLength: 255 },
    isSpecial : { type: DataTypes.BOOLEAN, maxLength: false },
    status: { type: DataTypes.INTEGER, defaultValue: 1 },
    seoTitle: { type: DataTypes.STRING, maxLength: 255 },
    seoDescription: { type: DataTypes.TEXT },
    seoKeywords: { type: DataTypes.STRING, maxLength: 255 },
    seoImage: { type: DataTypes.STRING, maxLength: 255 },
}, {
    timestamps: true,
});

module.exports = ProductModel
