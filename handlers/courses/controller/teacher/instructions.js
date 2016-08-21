'use strict';

let getUserSidebar = require('admin').getUserSidebar;

exports.get = function*() {
  this.locals.sidebar = yield* getUserSidebar(this.user);

  this.body = this.render('teacher/instructions');
};

