'use strict';

let CourseGroup = require('courses').CourseGroup;
let CourseParticipant = require('courses').CourseParticipant;
let CourseInvite = require('courses').CourseInvite;
let User = require('users').User;
let _ = require('lodash');
let getOrderInfo = require('payments').getOrderInfo;
let paymentMethods = require('./paymentMethods');
let allPaymentMethods = require('payments').methods;

module.exports = function* formatCourseOrder(order) {

  let group = yield CourseGroup.findById(order.data.group).populate('course');

  if (!group) {
    this.log.error("Not found group for order", order.toObject());
    this.throw(404);
  }

  let groupParticipants = yield CourseParticipant.find({
    group: order.data.group
  }).populate('user');

  let groupParticipantsByEmail = {};
  for (let key in groupParticipants) {
    let participant = groupParticipants[key];
    groupParticipantsByEmail[participant.user.email] = participant;
  }

  let invitesAccepted = yield CourseInvite.find({
    order: order._id,
    accepted: true
  });

  let invitesAcceptedByEmail = _.keyBy(invitesAccepted, 'email');

  let orderToShow = {
    created:      order.created,
    title:        group.title,
    number:       order.number,
    module:       order.module,
    amount:       order.amount,
    count:        order.data.count,
    contactName:  order.data.contactName,
    contactPhone: order.data.contactPhone,
    courseUrl:    group.course.getUrl(),
    participants: order.data.emails.map(function(email) {
      return {
        email:    email,
        inGroup: Boolean(groupParticipantsByEmail[email] || invitesAcceptedByEmail[email])
      };
    })

  };

  let orderInfo = yield* getOrderInfo(order);

  orderToShow.orderInfo = _.pick(orderInfo, ['status', 'statusText', 'descriptionProfile']);

  if (orderInfo.transaction) {
    orderToShow.paymentMethod = allPaymentMethods[orderInfo.transaction.paymentMethod].info.title;
    orderToShow.hasDocuments = orderInfo.transaction.paymentDetails && orderInfo.transaction.paymentDetails.hasDocuments;
  }


  return orderToShow;
};
