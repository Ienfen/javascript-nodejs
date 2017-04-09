'use strict';

const path = require('path');
const fs = require('fs');

const ru = (process.env.NODE_LANG == 'ru' || !process.env.NODE_LANG);

var handlers = [
  'countryCode', 'mongooseHandler', 'requestId', 'requestLog', 'nocache',

  // this middleware adds this.render method
  // it is *before errorHandler*, because errors need this.render
  'render',

  // errors wrap everything
  'errorHandler',

  // this logger only logs HTTP status and URL
  // before everything to make sure it log all
  'accessLogger',

  // pure node.js examples from tutorial
  // before session
  // before form parsing, csrf checking or whatever, bare node
  'nodeExample',

  // before anything that may deal with body
  // it parses JSON & URLENCODED FORMS,
  // it does not parse form/multipart
  'bodyParser',

  // parse FORM/MULTIPART
  // (many tweaks possible, lets the middleware decide how to parse it)
  'multipartParser',

  // right after parsing body, make sure we logged for development
  'verboseLogger',

  'conditional',

  ru && 'session',

  ru && 'passportSession',

  ru && 'passportRememberMe',

  ru && 'lastActivity',

  ru && 'csrfCheck',

  ru && 'flash',

  ru && 'paymentsMethods',

  process.env.NODE_ENV == 'development' && 'markup',
  process.env.NODE_ENV == 'development' && 'dev',

  ru && 'users',
  ru && 'auth',
  ru && 'ebook',
  ru && 'donate',
  ru && 'cache',
  ru && 'slack',
  'search',
  'staticPage', // must be before courses & other arbitrary url stuff
  ru && 'profile',
  ru && 'jb',
  ru && 'play',
  ru && 'screencast',
  'about',
  ru && 'imgur',
  ru && 'profileGuest',
  ru && 'quiz',
  ru && 'currencyRate',
  ru && 'payments',
  ru && 'downloadByLink',
  ru && 'newsletter',
  ru && 'courses',
  ru && 'admin',

  'ci',

  process.env.NODE_ENV == 'ebook' && 'bookify'
];

if (process.env.NODE_ENV == 'development') {
  handlers.push('qa');
}

// stick to bottom to detect any not-yet-processed /:slug
handlers.push('tutorial');

// filter existing handlers
handlers = handlers.filter(Boolean).filter(handler => {
  try {
    require.resolve(handler);
    return true;
  } catch (e) {
    return false;
  }
});

module.exports = handlers;
