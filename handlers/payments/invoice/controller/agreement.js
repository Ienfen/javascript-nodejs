var fs = require('fs');
var path = require('path');

exports.get = function*() {
  yield this.loadTransaction();

  if (!this.transaction) {
    this.log.debug("No transaction");
    this.throw(404);
  }

  if (this.transaction.paymentMethod != 'invoice') {
    this.log.debug("Only invoice transactions are allowed", this.transaction.toObject());
    this.throw(400);
  }

  var orderModule = require(this.transaction.order.module);


  if (this.user && this.user.hasRole('admin') && +this.query.amount) {
    this.transaction.amount = +this.query.amount;
  }

  const agreement = yield orderModule.getAgreement(this.transaction, this.params.ext == 'pdf');

  Object.assign(this, agreement);

};
