const homeRouter = require('./home');
const productRouter = require('./product');
const configRouter = require('./config');
const orderRouter = require('./order');
const sliderRouter = require('./slider');
const uploadRouter = require('./upload');
const redirectRouter = require('./redirect');

function route(app) {

    app.use('/api', homeRouter);

    app.use('/api/config', configRouter);

    app.use('/api/product', productRouter);

    app.use('/api/slider', sliderRouter);

    app.use('/api/order', orderRouter);

    app.use('/api/upload', uploadRouter);

    app.use('/api/redirect', redirectRouter);

}

module.exports = route;
