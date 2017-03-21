'use strict';

const config = require('config');

exports.get = function*() {
  this.locals.siteToolbarCurrentSection = "about";

  this.body = this.render('index', {mail: config.adminMail});
};
