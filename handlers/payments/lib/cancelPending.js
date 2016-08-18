var Order = require('../models/order');

module.exports = function*() {
  var lastNumber = 0;

  let canceled = [];
  while (true) {

    var order = yield Order.findOne({
      status: Order.STATUS_PENDING,
      number: {$gt: lastNumber}
    }).sort({number: 1}).limit(1);

    if (!order) break;
    lastNumber = order.number;

    yield* order.cancelIfPendingTooLong();
    if (order.status == Order.STATUS_CANCEL) {
      canceled.push(order);
    }
  }

  return canceled;
};

