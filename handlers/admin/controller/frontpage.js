'use strict';

const getUserSidebar = require('../lib/getUserSidebar');

exports.get = function*() {

  this.locals.sidebar = yield* getUserSidebar(this.user);

  this.body = this.render('frontpage');
};

