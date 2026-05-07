const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      connectTimeout: 60000,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    },
  }
);

sequelize
  .authenticate()
  .then(() => {
    console.log('[DB] Connection pool established successfully.');
  })
  .catch((error) => {
    console.error('[DB] Unable to connect to the database:', error);
  });

module.exports = { sequelize, Sequelize };
