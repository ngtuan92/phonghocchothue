require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const route = require('./src/routes/index');
const db = require('./src/config/db')

const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const session = require('express-session')
const flash = require('connect-flash');
const cors = require('cors');

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Headers']
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }
}));

const sessionMiddleware = session({
  secret: 'secret',
  cookie: { maxAge: 60000 },
  resave: false,
  saveUninitialized: false
});

app.use('/api/admin', sessionMiddleware, flash());
app.use('/api/login', sessionMiddleware);

db.sequelize;
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({
  extended: true,
  limit: '50mb'
}));
app.use(express.json({
  limit: '50mb'
}));

route(app);

if (process.env.NODE_ENV !== 'production') {
  const redis = require('./src/config/redis');
  redis.flushall().then(() => console.log('Cache cleared on startup'));
}

app.listen(port, () => {});
