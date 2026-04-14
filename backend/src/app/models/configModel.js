const db = require('../../config/db');
const {DataTypes} = require("sequelize");

const ConfigModel = db.sequelize.define("configs", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING, maxLength: 255 },
    type: { type: DataTypes.STRING, maxLength: 255 },
    content: { type: DataTypes.TEXT},
    musicName: {type: DataTypes.CHAR, allowNull: true}
}, {
    timestamps: true,
});

module.exports = ConfigModel
