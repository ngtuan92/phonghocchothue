const db = require('../../config/db');
const {DataTypes} = require("sequelize");
const productModel = require("./productModel");

const OrderModel = db.sequelize.define("orders", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, maxLength: 255 },
    phone: { type: DataTypes.STRING, maxLength: 255 },
    full_name: { type: DataTypes.STRING, maxLength: 255 },
    note: { type: DataTypes.STRING, maxLength: 255 },
    subject: { type: DataTypes.STRING, maxLength: 255 },
    student_number: { type: DataTypes.INTEGER },
    product_id: { type: DataTypes.INTEGER },
    date: { type: DataTypes.DATE, defaultValue: new Date }
}, {
    timestamps: true,
});

OrderModel.belongsTo(productModel, {
    foreignKey: 'product_id', // Tên cột khóa ngoại trong bảng ProductImage
    targetKey: 'id' // Tên cột khóa trong bảng cha product
});

module.exports = OrderModel