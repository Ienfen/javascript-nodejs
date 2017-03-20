var Router = require('koa-router');
var mongoose = require('mongoose');
var CacheEntry = require('./models/cacheEntry');
var mustBeAdmin = require('auth').mustBeAdmin;

var router = module.exports = new Router();

router.get('/destroy', mustBeAdmin, function*() {
  yield CacheEntry.remove();

  this.body = 'done ' + new Date();
});

