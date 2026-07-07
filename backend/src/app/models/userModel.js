const db = require('../../config/db');
const {DataTypes} = require("sequelize");

const UserModel = db.sequelize.define("users", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, maxLength: 255 },
    email: { type: DataTypes.STRING, maxLength: 255 },
    password: { type: DataTypes.STRING, maxLength: 255 },
}, {
    timestamps: true,
});

module.exports = UserModel