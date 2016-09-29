var mongoose = require('mongoose');
var Transaction = require('../models/transaction');
var User = require('users').User;
var assert = require('assert');

// Populates this.transaction with the transaction by "transactionNumber" parameter
// options.skipOwnerCheck is for signed submissions, set to true allows anyone to load transaction
module.exports = function* (field, options) {
  options = options || {};
  if (!field) field = 'transactionNumber';

  var transactionNumber = this.request.body && this.request.body[field] || this.params[field] || this.query[field];

  this.log.debug('loadTransaction number: ' + transactionNumber);
  if (!transactionNumber) {
    return;
  }

  var transaction = yield Transaction.findOne({number: transactionNumber}).populate('order');

  if (!transaction) {
    this.throw(404, 'Transaction not found');
  }

  yield function(callback) {
    transaction.order.populate('user', callback);
  };

  if (!options.skipOwnerCheck) {
    var belongsToUser = this.user && transaction.order.user && (String(this.user._id) == String(transaction.order.user._id));
    var orderInSession = this.session.orders && this.session.orders.indexOf(transaction.order.number) != -1;

    if (!belongsToUser && !orderInSession && !this.isAdmin) {
      this.throw(403, 'The order is not in session');
    }
  }

  assert(!this.transaction, "this.transaction is already set");
  assert(!this.order, "this.order is already set");

  this.transaction = transaction;
  this.order = transaction.order;

  this.log.debug("tx loaded");

};
