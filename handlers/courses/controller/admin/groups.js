'use strict';

var _ = require('lodash');
var Order = require('payments').Order;
var Transaction = require('payments').Transaction;
var User = require('users').User;
var CourseParticipant = require('../../models/courseParticipant');
var CourseInvite = require('../../models/courseInvite');
var CourseGroup = require('../../models/courseGroup');
var getGroupAmount = require('../../lib/getGroupAmount');
var getGroupOrderCounts = require('../../lib/getGroupOrderCounts');
var moment = require('momentWithLocale');
let getUserSidebar = require('admin').getUserSidebar;

exports.get = function*() {

  this.locals.sidebar = yield* getUserSidebar(this.user);

  let cutDate = new Date();
  cutDate.setDate(cutDate.getDate() - 90);
  let groups = yield CourseGroup.find({
    dateEnd: {
      $gt: cutDate
    }
  }).sort({isArchived: 1, dateStart: -1}).populate('teacher');

  this.locals.groups = [];

  for (let i = 0; i < groups.length; i++) {
    let group = groups[i];

    this.locals.groups.push({
      orderCount: yield* getGroupOrderCounts(group),
      amount: yield* getGroupAmount(group),
      teacher: group.teacher,
      slug: group.slug,
      dateStart: group.dateStart,
      dateEnd: group.dateEnd,
      isArchived: group.isArchived,
      teacherAgreement: group.teacherAgreement,
      agreementNumber: moment(group.dateStart).format('YYYYMMDDHHmm')
    });
  }

  this.body = this.render('admin/groups');
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

      let transaction = yield Transaction.findOne({
        order:  order._id,
        status: Transaction.STATUS_SUCCESS
      });

      if (transaction) {

        yield transaction.log('возврат');

        yield transaction.persist({
          status: Transaction.STATUS_REFUND
        });
      }

    }
  }

  yield this.order.persist();

  this.redirect(this.originalUrl);

};

