'use strict';

var Router = require('koa-router');

var githubHook = require('./controller/githubHook');

var router = module.exports = new Router();

router.post('/github-hook', githubHook.post);

