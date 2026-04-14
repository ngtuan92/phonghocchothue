const {Sequelize} = require("sequelize");
require('dotenv').config();

const sequelize = new Sequelize(
   process.env.DB_NAME,
   process.env.DB_USER || 'root',
   process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: process.env.DB_DIALECT || 'mysql'
    }
  );

sequelize.authenticate().then(() => {
   console.log('Connection has been established successfully.');
}).catch((error) => {
   console.error('Unable to connect to the database');
});

module.exports = { sequelize };
