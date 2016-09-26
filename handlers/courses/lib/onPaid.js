"use strict";

const Order = require('payments').Order;
const assert = require('assert');
const path = require('path');
const log = require('log')();
const config = require('config');
const sendMail = require('mailer').send;
const CourseInvite = require('../models/courseInvite');
const CourseGroup = require('../models/courseGroup');
const createOrderInvites = require('./createOrderInvites');
const VideoKey = require('videoKey').VideoKey;
const sendInvite = require('./sendInvite');
const getGroupOrderCounts = require('./getGroupOrderCounts');

// not a middleware
// can be called from CRON
module.exports = function* (order) {

  yield Order.populate(order, {path: 'user'});

  var group = yield CourseGroup.findById(order.data.group);

  var emails = order.data.emails;

  // order.user is the only one registered person, we know all about him
  var orderUserIsParticipant = emails.indexOf(order.user.email) != -1;

  // is there anyone except the user?
  var orderHasParticipantsExceptUser = order.data.count > 1 || emails[0] != order.user.email;

  var orderHasParticipants = emails.length > 0;

  log.debug("orderHasParticipants:", orderHasParticipants, "orderUserIsParticipant:", orderUserIsParticipant, "orderHasParticipantsExceptUser:", orderHasParticipantsExceptUser);

  var invites = yield* createOrderInvites(order);

  var orderUserInvite;
  // send current user's invite in payment confirmation letter
  if (orderUserIsParticipant) {
    // probably generated above, but maybe(?) not, ensure we get it anyway
    orderUserInvite = yield CourseInvite.findOne({
      order: order._id,
      email: order.user.email
    });
    assert(orderUserInvite);
    invites = invites.filter(function(invite) {
      return invite.email != order.user.email;
    });
  }

  let orderCounts = yield getGroupOrderCounts(group);

  if (orderCounts.success + orderCounts.pendingFiltered * 0.5 >= group.participantsLimit) {
    group.isOpenForSignup = false; // we're full!
  }

  yield group.persist();

  yield sendMail({
    templatePath:              path.join(__dirname, '../templates/email/paymentConfirmation'),
    from:                      'orders',
    to:                        order.email,
    amount:                    order.amount,
    profileOrdersUrl:          config.server.siteHost + order.user.getProfileUrl() + '/orders',
    orderNumber:               order.number,
    subject:                   order.amount ?
                                 ("Подтверждение оплаты за курс, заказ " + order.number) :
                                 ("Одобрена запись на курс, заказ " + order.number),
    orderHasParticipants:      orderHasParticipants,
    orderUserInviteLink:       orderUserIsParticipant && (config.server.siteHost + '/courses/invite/' + orderUserInvite.token),
    orderUserIsParticipant:    orderUserIsParticipant,
    orderHasOtherParticipants: orderHasParticipantsExceptUser
  });

  // send invites in parallel, for speed
  yield invites.map(function(invite) {
    return sendInvite(invite);
  });

  order.status = Order.STATUS_SUCCESS;

  yield order.persist();

  log.debug("Order success: " + order.number);
};


