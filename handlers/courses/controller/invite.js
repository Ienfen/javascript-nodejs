'use strict';

const Course = require('../models/course');
const CourseInvite = require('../models/courseInvite');
const config = require('config');
const CourseGroup = require('../models/courseGroup');
const registerParticipants = require('../lib/registerParticipants');
const User = require('users').User;
const VideoKey = require('videoKey').VideoKey;
const pick = require('lodash/pick');
const countries = require('countries');
const LOGIN_SUCCESSFUL = 1;
const LOGGED_IN_ALREADY = 2;
const NO_SUCH_USER = 3;
const CourseParticipant = require('../models/courseParticipant');
const ImgurImage = require('imgur').ImgurImage;
const log = require('log')();

exports.all = function*() {

  if (this.method != 'POST' && this.method != 'GET') {
    this.throw(404);
  }

  var invite = yield CourseInvite.findOne({
    token: this.params.inviteToken || this.request.body && this.request.body.inviteToken
  }).populate('group order').exec();

  this.locals.mailto = "mailto:orders@javascript.ru";

  if (!invite) {
    this.throw(404);
  }

  if (invite.order) {
    this.locals.mailto += "?subject=" + encodeURIComponent('Заказ ' + invite.order.number);
  }

  if (invite.accepted) {
    if (this.user && this.user.email == invite.email) {
      this.addFlashMessage("success", "Поздравляем, вы присоединились к курсу. Ниже, рядом с курсом, вы найдёте инструкцию.");
      this.redirect(this.user.getProfileUrl() + '/courses');
    } else {
      this.status = 403;
      this.body = this.render('/notification', {
        title:   "Это приглашение уже принято",
        message: {
          type: 'success',
          html: "Это приглашение уже принято. Зайдите в учётную запись участника для доступа к курсу."
        }
      });
    }
    return;
  }

  // invite is also a login token, so we limit it's validity
  if (invite.validUntil < Date.now()) {
    this.status = 404;
    this.body = this.render('/notification', {
      title:   "Ссылка устарела",
      message: {
        type: 'success',
        html: `
          Извините, ссылка по которой вы перешли, устарела.
          Если у вас возникли какие-либо вопросы – пишите на <a href="mailto:orders@javascript.ru">orders@javascript.ru</a>
          `
      }
    });
    return;
  }


  yield CourseGroup.populate(invite.group, 'course');

  var userByEmail = yield User.findOne({
    email: invite.email
  }).exec();

  if (userByEmail) {
    var participantByEmail = yield CourseParticipant.findOne({
      isActive: true,
      group:    invite.group._id,
      user:     userByEmail._id
    }).exec();

    // invite was NOT accepted, but this guy is a participant (added manually?),
    // so show the same as accepted
    if (participantByEmail) {
      if (this.user && this.user.email == invite.email) {
        this.addFlashMessage("success", "Вы уже участник курса. Ниже, рядом с курсом, вы найдёте инструкцию.");
        this.redirect(this.user.getProfileUrl() + '/courses');
      } else {
        this.status = 403;
        this.body = this.render('/notification', {
          title:   "Это приглашение уже принято",
          message: {
            type: 'success',
            html: "Это приглашение уже принято. Зайдите в учётную запись участника для доступа к курсу."
          }
        });
      }
      return;
    }
  }

  // invite may be outdated, email changed in order settings
  // 1 order may have many invites, many of them are invalid
  // so let's check if the invite is still actual
  // invalid invite, person not in list
  if (!~invite.order.data.emails.indexOf(invite.email)) {
    this.body = this.render('invite/deny', {
      email:       invite.email,
      contactName: invite.order.data.contactName,
      orderNumber: invite.order.number
    });

    return;
  }

  // ----------- INVITE IS VALID ----------------

  this.locals.title = invite.group.title;
  this.locals.invite = invite;

  var isLoggedIn = yield* loginByInvite.call(this, invite);

  if (isLoggedIn == NO_SUCH_USER) {
    if (this.user) this.logout();
    yield* register.call(this, invite);

  } else {
    if (isLoggedIn == LOGIN_SUCCESSFUL) {
      this.locals.wasLoggedIn = true;
    }
    yield* askParticipantDetails.call(this, invite);
  }

};

function* askParticipantDetails(invite) {

  // NB: this.user is the right user, guaranteed by loginByInvite

  var selectCountries = Object.create(countries.all);
  selectCountries[""] = {
    "co": "",
    "ph": "",
    "na": " выберите страну "
  };

  this.locals.title = "Анкета участника\n" + invite.group.title;
  this.locals.countries = selectCountries;

  if (this.method == 'POST') {
    var participantData = pick(this.request.body,
      'photoId firstName surname country city aboutLink occupation purpose wishes'.split(' ')
    );
    participantData.user = this.user;
    participantData.group = invite.group._id;
    participantData.invite = invite._id;

    if (participantData.photoId) {
      var photo = yield ImgurImage.findOne({imgurId: this.request.body.photoId}).exec();
      if (photo) { // no photo if stale form (?) or just bad post
        participantData.photo = photo.link;
      }
    }

    if (!participantData.photo && this.user.photo) {
      participantData.photo = this.user.photo;
    }


    var participant = new CourseParticipant(participantData);

    try {

      yield participant.persist();

    } catch (e) {
      this.log.debug("Participant persist error", e);
      if (e.errors.group) {
        log.error(`group error (not unique?) for (${participant.group}, ${participant.user._id})`);
        throw e;
      }

      var errors = {};
      for (var key in e.errors) {
        errors[key] = e.errors[key].message;
      }

      this.body = this.render('invite/askParticipantDetails', {
        errors: errors,
        form:   participantData
      });

      return;
    }

    this.log.debug(participant.toObject(), "participant is accepted");

    // make the new picture user avatar
    if (participant.photo && !this.user.photo) {
      yield participant.user.persist({
        photo: participant.photo
      });
    }

    yield* acceptParticipant.call(this, invite, participant);

    // will show "welcome" cause the invite is accepted
    this.redirect('/courses/invite/' + invite.token);

  } else if (this.method == 'GET') {

    this.body = this.render('invite/askParticipantDetails', {
      errors: {},
      form:   {
        country: 'ru'
      }
    });

  }

}

function* acceptParticipant(invite, participant) {

  participant.user.profileTabsEnabled.addToSet('courses');
  yield participant.user.persist();

  yield invite.accept(participant);

  yield* registerParticipants(invite.group);

}


function* register(invite) {

  if (this.method == 'POST') {

    // do register the man, email is verified
    var user = new User({
      email:         invite.email,
      displayName:   this.request.body.displayName,
      password:      this.request.body.password,
      verifiedEmail: true
    });

    try {
      yield user.persist();
    } catch (e) {
      var errors = {};
      for (var key in e.errors) {
        errors[key] = e.errors[key].message;
      }

      this.body = this.render('invite/register', {
        errors: e.errors,
        form:   {
          displayName: this.request.body.displayName,
          password:    this.request.body.password
        }
      });
      return;
    }

    yield this.login(user);

    this.redirect('/courses/invite/' + invite.token);

  } else {
    this.body = this.render('invite/register', {
      errors: {},
      form:   {}
    });
  }
}

/**
 * Logs in the current user using invite data
 * Makes email verified
 * @param invite
 * @returns LOGIN_SUCCESSFUL / NO_SUCH_USER / LOGGED_IN_ALREADY
 */
function* loginByInvite(invite) {

  if (this.user && this.user.email == invite.email) {
    return LOGGED_IN_ALREADY;
  }

  var userByEmail = yield User.findOne({
    email: invite.email
  }).exec();

  if (!userByEmail) return NO_SUCH_USER;

  if (!userByEmail.verifiedEmail) {
    // if pending verification => invite token confirms email
    yield userByEmail.persist({
      verifiedEmail: true
    });
  }

  yield this.login(userByEmail);
  return LOGIN_SUCCESSFUL;
}
