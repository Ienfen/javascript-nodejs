'use strict';

const _ = require('lodash');
const path = require('path');
const Transaction = require('payments').Transaction;
const User = require('users').User;
const CourseParticipant = require('../../models/courseParticipant');
const CourseInvite = require('../../models/courseInvite');
const CourseGroup = require('../../models/courseGroup');
const registerParticipants = require('../../lib/registerParticipants');
const assert = require('assert');
const sendMail = require('mailer').send;

exports.post = function*() {

  let invite = yield CourseInvite.findById(this.request.body.id).populate('participant order');

  this.log.debug("invite edit", this.request.body.group, invite.group.toString());

  if (this.request.body.group != invite.group.toString()) {
    // move person to another group

    let oldGroup = yield CourseGroup.findById(invite.group);
    let newGroup = yield CourseGroup.findById(this.request.body.group);
    assert(newGroup);

    yield invite.persist({
      group: this.request.body.group
    });

    if (invite.participant) {
      yield invite.participant.persist({
        group: this.request.body.group,
        registrantKey: undefined,
        joinUrl: undefined
      });
    }

    yield* registerParticipants(newGroup);

    this.log.debug("transfer complete for invite", invite);
    if (this.request.body.notify) {

      yield* sendMail({
        templatePath: path.join(__dirname, '../../templates/email/move'),
        to: invite.email,
        subject: "Вы переведены в группу " + newGroup.title,
        oldGroup,
        newGroup
      });

      this.log.debug("transfer notify sent for invite", invite);

      this.addFlashMessage('success', 'Перевод завершён, уведомление отослано.');
    } else {
      this.addFlashMessage('success', 'Перевод завершён, уведомление НЕ отсылалось.');
    }

    this.redirect(`/courses/admin/orders/${invite.order.number}`);

  } else {
    this.throw(501, "Not implemented", {
      info: "Same group already"
    });
  }

};

