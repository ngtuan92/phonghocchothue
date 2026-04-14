const db = require('../../config/db');
const { DataTypes } = require('sequelize');

// Bảng lưu cấu hình redirect URL
// Ví dụ: fromPath = "/phong/san-pham-1", toPath = "/phong/san-pham-new"
const RedirectModel = db.sequelize.define(
  'redirects',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fromPath: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    toPath: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true, // true = đang hoạt động
    },
    note: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = RedirectModel;


