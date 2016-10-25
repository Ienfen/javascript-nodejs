var Router = require('koa-router');

var bookify = require('./controller/bookify');

var router = module.exports = new Router();

router.get('/pdf/:slug', bookify.get);
router.get('/epub/:slug', bookify.get);

