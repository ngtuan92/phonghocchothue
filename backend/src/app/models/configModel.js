const db = require('../../config/db');
const {DataTypes} = require("sequelize");

const ConfigModel = db.sequelize.define("configs", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING, maxLength: 255 },
    type: { type: DataTypes.STRING, maxLength: 255 },
    section: { type: DataTypes.STRING, maxLength: 100, defaultValue: 'general' },
    content: { type: DataTypes.TEXT},
    musicName: {type: DataTypes.CHAR, allowNull: true},
    borderRadius: { type: DataTypes.STRING(50), field: 'border_radius', allowNull: true },
    lineHeight: { type: DataTypes.STRING(50), field: 'line_height', allowNull: true },
    lineHeightMobile: { type: DataTypes.STRING(50), field: 'line_height_mobile', allowNull: true }
}, {
    timestamps: true,
});

module.exports = ConfigModel
