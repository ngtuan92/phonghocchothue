const db = require('../../config/db');
const {DataTypes} = require("sequelize");

const ProductModel = db.sequelize.define("products", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, maxLength: 255 },
    name_rich: { type: DataTypes.TEXT },
    slug: { type: DataTypes.STRING, maxLength: 255, unique: true, allowNull: true },
    content: { type: DataTypes.TEXT('long') },
    image: { type: DataTypes.STRING, maxLength: 255 },
    equipment: { type: DataTypes.TEXT },
    contains: { type: DataTypes.TEXT },
    description : { type: DataTypes.TEXT },
    price: { type: DataTypes.TEXT },
    unit: { type: DataTypes.STRING, maxLength: 50, allowNull: true, defaultValue: "buổi" },
    capacity: { type: DataTypes.STRING, maxLength: 255 },
    isSpecial : { type: DataTypes.BOOLEAN, maxLength: false },
    status: { type: DataTypes.INTEGER, defaultValue: 1 },
    seoTitle: { type: DataTypes.STRING, maxLength: 255 },
    seoDescription: { type: DataTypes.TEXT },
    seoKeywords: { type: DataTypes.STRING, maxLength: 255 },
    seoImage: { type: DataTypes.STRING, maxLength: 255 },
    lineHeight: { type: DataTypes.STRING(50), field: 'line_height', allowNull: true },
    lineHeightMobile: { type: DataTypes.STRING(50), field: 'line_height_mobile', allowNull: true },
    fontSize: { type: DataTypes.STRING(50), field: 'font_size', allowNull: true },
    fontSizeMobile: { type: DataTypes.STRING(50), field: 'font_size_mobile', allowNull: true },
    nameFontSize: { type: DataTypes.STRING(50), field: 'name_font_size', allowNull: true },
    nameFontSizeMobile: { type: DataTypes.STRING(50), field: 'name_font_size_mobile', allowNull: true },
    translateY: { type: DataTypes.STRING(50), field: 'translate_y', allowNull: true },
    translateYMobile: { type: DataTypes.STRING(50), field: 'translate_y_mobile', allowNull: true }
}, {
    timestamps: true,
});

module.exports = ProductModel
