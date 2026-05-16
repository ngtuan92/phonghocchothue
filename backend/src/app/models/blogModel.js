const db = require('../../config/db');
const { DataTypes } = require("sequelize");

const BlogModel = db.sequelize.define("blogs", {
    id: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
    },
    title: { 
        type: DataTypes.STRING(255), 
        allowNull: false 
    },
    slug: { 
        type: DataTypes.STRING(255), 
        unique: true, 
        allowNull: false 
    },
    excerpt: { 
        type: DataTypes.TEXT, 
        allowNull: true 
    },
    content: { 
        type: DataTypes.TEXT('long'),
        allowNull: false 
    },
    thumbnail: { 
        type: DataTypes.STRING(255), 
        allowNull: true 
    },
    category: { 
        type: DataTypes.STRING(100), 
        defaultValue: 'kien-thuc' 
    },
    authorName: { 
        type: DataTypes.STRING(100), 
        defaultValue: 'Hoa Học Trò' 
    },
    status: { 
        type: DataTypes.INTEGER, 
        defaultValue: 1
    },
    publishedAt: { 
        type: DataTypes.DATE, 
        defaultValue: DataTypes.NOW 
    }
}, {
    timestamps: true,
});

module.exports = BlogModel;
