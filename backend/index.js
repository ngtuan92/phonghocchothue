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

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Headers'],
  credentials: true
};

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.log(`[PERF] ${req.method} ${req.originalUrl} - ${duration}ms`);
    }
  });
  next();
});

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(fileUpload({
  limits: { fileSize: 100 * 1024 * 1024 }
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
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (filePath.match(/\.(ttf|woff|woff2|otf|mp3|wav|ogg|m4a)$/)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

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



// app.listen(port, () => {});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
