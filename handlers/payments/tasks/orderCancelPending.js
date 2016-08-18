var co = require('co');
var cancelPending = require('../lib/cancelPending');
var currencyRate = require('currencyRate');

module.exports = function() {

  return function() {

    return co(function*() {
      yield* currencyRate.boot();
      yield* cancelPending();
    });

  };
};

