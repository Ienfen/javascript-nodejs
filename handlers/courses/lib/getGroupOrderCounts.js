const Order = require('payments').Order;
const groupBy = require('lodash/groupBy');

module.exports = function*(group) {

  let orders = yield Order.find({
    'data.group': group._id,
    status:       {
      $in: [Order.STATUS_SUCCESS, Order.STATUS_PENDING]
    }
  });

  // filter out duplicates
  let ordersByUser = groupBy(orders, 'user');

  let successCount = orders
    .filter(o => o.status == Order.STATUS_SUCCESS)
    .reduce((prev, current) => prev + current.data.count, 0);

  let pendingCount = orders
    .filter(o => o.status == Order.STATUS_PENDING)
    .reduce((prev, current) => prev + current.data.count, 0);

  let pendingFilteredCount = 0;

  for (let userId in ordersByUser) {
    let ordersForUser = ordersByUser[userId];

    let successfulOrder = ordersForUser.filter(o => o.status == Order.STATUS_SUCCESS);

    // if user has successful order, we don't count pending, probably a dupe
    if (successfulOrder.length) {
      continue;
    }
    pendingFilteredCount += ordersForUser[0].data.count;
  }

  return {
    success:         successCount,
    pending:         pendingCount,
    pendingFiltered: pendingFilteredCount
  };

};
