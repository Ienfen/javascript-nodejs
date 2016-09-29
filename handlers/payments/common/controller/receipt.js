const Transaction = require('../../models/transaction');
const Order = require('../../models/order');

exports.get = function*() {
  yield this.loadTransaction();

  if (this.order.status != Order.STATUS_SUCCESS) {
    this.throw(404, "Order is not successful yet");
  }

  let getReceipt = require(this.order.module).getReceipt;

  if (!getReceipt) {
    this.throw(404);
  }

  const receiptDoc = yield* getReceipt(this.transaction, this.params.ext == 'pdf');

  Object.assign(this, receiptDoc);

};
