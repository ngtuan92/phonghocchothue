const db = require('../../config/db');
const {DataTypes} = require("sequelize");

const SliderModel = db.sequelize.define("sliders", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, maxLength: 255 },
    image: { type: DataTypes.STRING, maxLength: 255 },
    position: { type: DataTypes.INTEGER, defaultValue: 0 },
    type: { type: DataTypes.STRING, defaultValue: 'gallery' },
    borderRadius: { type: DataTypes.STRING(50), field: 'border_radius', allowNull: true }
}, {
    timestamps: true,
});

module.exports = SliderModel