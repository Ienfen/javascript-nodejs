const Order = require('payments').Order;
const CourseParticipant = require('../models/courseParticipant');

module.exports = function*(group) {

  let participants = yield CourseParticipant.find({
    group:    group._id,
    isActive: true
  }).populate('user invite');

  let amount = {
    amount: 0,
    missing: []
  };

  // console.log(participants);
  // console.log("COUNT GROUP", group.title, participants.length);
  for(let j=0; j<participants.length; j++) {
    let participant = participants[j];

    let order;
    if (participant.invite) {
      order = yield Order.findById(participant.invite.order);
    } else {
      order = yield Order.findOne({
        'data.group':  group._id,
        'data.emails': participant.user.email,
        status:        Order.STATUS_SUCCESS
      });
    }

    if (!order) {
      // console.log("MISSING", participant.user.email);
      amount.missing.push(participant.user.email);
    } else {
      // console.log("ADD", order.amount / order.data.count);
      amount.amount += order.amount / order.data.count;
    }

  }

  return amount;

};
