'use strict';

var Order = require('payments').Order;
var Transaction = require('payments').Transaction;
var User = require('users').User;
var CourseParticipant = require('../../models/courseParticipant');
var CourseInvite = require('../../models/courseInvite');
var CourseGroup = require('../../models/courseGroup');

exports.get = function*() {

  let transactionNumber = this.params.transactionNumber || this.query.transactionNumber;
  let orderNumber = this.params.orderNumber || this.query.orderNumber;

  if (transactionNumber) {
    yield this.loadTransaction();
    if (this.order) {
      this.redirect('/courses/admin/orders/' + this.order.number);
      return;
    }
  } else if (orderNumber) {

    yield* loadOrderAdmin.call(this);

    if (!this.order) {
      this.throw(404, 'Нет такого заказа.');
    }

  } else {
    this.body = this.render('admin/orders');
    return;
  }

  var transactions;

  /*
   transactions = yield Transaction.find({
   order: this.order._id
   }).sort({
   modified: -1
   });
   */
  // do we need to show all TX ?
  transactions = yield Transaction.find({
    order:  this.order._id,
    status: {$in: [Transaction.STATUS_REFUND, Transaction.STATUS_PENDING, Transaction.STATUS_SUCCESS]}
  });

  this.locals.order = this.order;
  this.locals.transactions = transactions;

  this.locals.invites = yield CourseInvite.find({
    order: this.order._id
  }).populate('group participant');

/*
  let group = yield CourseGroup.findById(this.order.data.group);
  if (!group) {
    this.throw(new Error("No group for order " + this.order._id));
  }
*/
  this.locals.groupsAvailable = yield CourseGroup.find({
    dateEnd: {
      $gt: Date.now()
    }
  }).populate('course teacher').sort({dateStart: -1})

  this.body = this.render('admin/order');
};

function* loadOrderAdmin() {

  yield* this.loadOrder();

  if (!this.order) {
    this.throw(404, {
      info: 'Нет такого заказа.'
    });
  }

  if (!this.order.data.group) {
    this.throw(404, {
      info: 'Нет такого заказа на курс'
    });
  }

}

exports.post = function*() {

  yield* loadOrderAdmin.call(this);

  this.order.amount = this.request.body.amount;
  this.order.currency = this.request.body.currency;

  let order = this.order;

  function* paidTx() {
    let transaction = yield Transaction.findOne({
      order:  order._id,
      status: Transaction.STATUS_PENDING
    });
    yield* order.onPaid(transaction);

    order.status = Order.STATUS_SUCCESS;
  }

  function* paidDirect() {
    let transaction = yield Transaction.findOne({
      order:  order._id,
      status: Transaction.STATUS_PENDING
    });

    if (transaction) {
      yield transaction.persist({
        status: Transaction.STATUS_FAIL
      });
    }

    yield Transaction.create({
      order:         order._id,
      amount:        order.amount,
      status:        Transaction.STATUS_SUCCESS,
      currency:      order.currency,
      paymentMethod: 'direct'
    });

    yield* order.onPaid();

    order.status = Order.STATUS_SUCCESS;
  }

  if (this.order.status == Order.STATUS_CANCEL) {

    if (this.request.body.action == 'pending') {
      this.order.status = Order.STATUS_PENDING;
    } else if (this.request.body.action == 'paid-tx') {
      yield* paidTx();
    } else if (this.request.body.action == 'paid-direct') {
      yield* paidDirect();
    }

  } else if (this.order.status == Order.STATUS_PENDING) {
    if (this.request.body.action == 'paid-tx') {
      yield* paidTx();
    } else if (this.request.body.action == 'paid-free') {
      this.order.amount = 0;
      yield* order.onPaid();
      order.status = Order.STATUS_SUCCESS;
    } else if (this.request.body.action == 'paid-direct') {
      yield* paidDirect();
    }
  } else if (this.order.status == Order.STATUS_SUCCESS) {
    if (this.request.body.action == 'cancel') {
      this.order.status = Order.STATUS_CANCEL;

      var userIdsByEmails = yield User.find({
        email: {
          $in: this.order.data.emails
        }
      }, {id: 1});

      userIdsByEmails = userIdsByEmails.map(user => user._id);

      var participants = yield CourseParticipant.find({
        group:    this.order.data.group,
        user:     {
          $in: userIdsByEmails
        },
        isActive: true
      });

      this.log.debug("cancel participants", participants);

      for (var i = 0; i < participants.length; i++) {
        var participant = participants[i];
        yield participant.persist({
          isActive: false
        });
      }

      let invites = yield CourseInvite.find({
        order: order._id,
        accepted: false
      });

      // delete non-accepted invites
      for (var i = 0; i < invites.length; i++) {
        var invite = invites[i];
        yield invite.remove();
      }

      /*
      let transaction = yield Transaction.findOne({
        order:  order._id,
        status: Transaction.STATUS_SUCCESS
      });

      if (transaction) {

        yield transaction.log('возврат');

        yield transaction.persist({
          status: Transaction.STATUS_REFUND
        });
      }*/

    }
  }

  let pendingTransaction = yield Transaction.findOne({
    order:  order._id,
    status: Transaction.STATUS_PENDING
  });

  if (pendingTransaction) {
    pendingTransaction.amount = order.convertAmount(pendingTransaction.currency);
    yield pendingTransaction.persist();
  }

  yield this.order.persist();

  this.redirect(this.originalUrl);

};

