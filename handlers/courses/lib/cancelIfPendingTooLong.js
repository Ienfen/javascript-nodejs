"use strict";

var Order = require('payments').Order;
var User = require('users').User;
var CourseGroup = require('../models/courseGroup');
var assert = require('assert');
const mailer = require('mailer');
var path = require('path');
var config = require('config');
const log = require('log')();

module.exports = function*(order) {

  assert(order.user);

  var ordersSameGroupAndUser = yield Order.find({
    user:         order.user,
    'data.group': order.data.group
  }).exec();

  var orderSuccessSameGroupAndUser = ordersSameGroupAndUser.filter(function(order) {
    return order.status == Order.STATUS_SUCCESS;
  })[0];


  var orderUser = yield User.findById(order.user);
  var orderGroup = yield CourseGroup.findById(order.data.group);

  log.debug("order " + order.number);

  var groupStartsSoon = Date.now() > orderGroup.dateStart - 86400 * 1000;

  if (!groupStartsSoon) {
    // if more than 1 day before group starts, then keep...
    if (orderSuccessSameGroupAndUser) {
      // 2 days if has success order to same group
      if (order.modified > Date.now() - 2 * 86400 * 1e3) {
        //console.log(order.modified, Date.now() - 2 * 24 * 86400 * 1e3, +order.modified);
        log.debug(`...modified ${order.modified} less than 2 days, return`);
        return;
      }
    } else {
      // 7 days wait otherwise
      if (order.modified > Date.now() - 7 * 86400 * 1e3) {
        log.debug(`...modified ${order.modified} less than 7 days, return`);
        return;
      }
    }
  }

  log.debug("Canceling " + order.number);

  assert(orderGroup);
  assert(orderUser);

  if (!orderUser.deleted) {
    yield* mailer.send({
      from:              'orders',
      templatePath:      path.join(__dirname, '../templates/email/orderCancel'),
      to:                orderUser.email,
                         orderSuccessSameGroupAndUser,
                         orderUser,
                         orderGroup,
                         groupStartsSoon,
      profileOrdersLink: config.server.siteHost + orderUser.getProfileUrl() + '/orders',
                         order,
      subject:           "[Курсы, система регистрации] Отмена заказа " + order.number + " на сайте javascript.ru"
    });

    log.debug("Sent letter to " + orderUser.email);
  }


  yield order.persist({
    status: Order.STATUS_CANCEL
  });

};
