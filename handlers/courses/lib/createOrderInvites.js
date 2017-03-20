"use strict";

const sendMail = require('mailer').send;
const CourseInvite = require('../models/courseInvite');
const _ = require('lodash');
const log = require('log')();
const sendInvite = require('./sendInvite');
const CourseGroup = require('../models/courseGroup');
const CourseParticipant = require('../models/courseParticipant');
const User = require('users').User;

/**
 * create invites for the order
 * except those that already exist
 * @param order
 */
module.exports = function*(order) {

  var emails = order.data.emails;

  log.debug("emails", emails);

  // get existing invites, so that we won't recreate them
  var existingInvites = yield CourseInvite.find({ order: order._id });
  var existingInviteByEmails = _.keyBy(existingInvites, 'email');

  log.debug("existing invites", existingInviteByEmails);

  // get existing participants, they don't need invites
  var group = yield CourseGroup.findById(order.data.group);

  var participants = yield CourseParticipant.find({
    group: group._id
    // all participants are filtered out, even inactive (they don't need invite)
  }).populate('user');

  var participantsByEmail = _.keyBy(participants.map(p => p.user), 'email');

  log.debug("participantsByEmail", participantsByEmail);

  var invites = [];
  for (var i = 0; i < emails.length; i++) {
    var email = emails[i];
    if (participantsByEmail[email]) continue;    // in group already
    if (existingInviteByEmails[email]) continue; // invite exists already

    log.debug("create invite for email", email);

    var invite = new CourseInvite({
      order: order._id,
      group: group._id,
      // max(now + 7 days, course start + 7 days)
      validUntil: new Date( Math.max(Date.now(), group.dateStart) + 7 * 24 * 86400 * 1e3),
      email: email
    });
    invites.push(invite);

    log.debug("created invite", invite.toObject());

    yield invite.persist();

    // not only send invite, but enable the tab so that the user can manually accept it
    yield User.update({
      email: email
    }, {
      $addToSet: {profileTabsEnabled: 'courses'}
    });

  }

  log.debug("invites result", invites);

  return invites;
};
