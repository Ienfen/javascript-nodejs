let cancelPending = require('../../lib/cancelPending');

// call by cron
exports.get = function*(next) {

  this.nocache();

  if (!this.isAdmin) {
    this.throw(403);
  }

  let canceled = yield* cancelPending();

  this.body = Array.from(canceled);
};
