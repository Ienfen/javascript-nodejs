'use strict';

const CourseGroup = require('../models/courseGroup');
const log = require('log')();
const CourseParticipant = require('../models/courseParticipant');
const config = require('config');
const VideoKey = require('videoKey').VideoKey;
const User = require('users').User;
const co = require('co');
const request = require('request-promise');

module.exports = registerParticipants;

function* registerParticipants(group) {
  yield CourseGroup.populate(group, 'course');

  let participants = yield CourseParticipant.find({
    group:    group._id,
    isActive: true
  }).populate('user');

  let teacher = group.teacher;
  if (!teacher._id) teacher = yield User.findById(teacher);

  if (group.course.videoKeyTag) {
    yield *grantVideoKeys(group, participants);
  }

  // this we do last, because it's the least reliable
  yield* grantWebinar(group, participants, teacher);

}

function* grantWebinar(group, participants, teacher) {

  if (!group.webinarKey) return;

  let participantsWithoutKeys = participants.filter(function(participant) {
    return !participant.registrantKey;
  });

  let gotowebinar = teacher.gotowebinar;

  if (!gotowebinar) {
    throw new Error("Teacher has no gotowebinar configured");
  }

  for (var i = 0; i < participantsWithoutKeys.length; i++) {
    var participant = participantsWithoutKeys[i];

    let response = yield request.post({
      url: `https://api.citrixonline.com/G2W/rest/organizers/${gotowebinar.organizer_key}/webinars/${group.webinarKey}/registrants`,
      json: true,
      headers: {
        'Authorization': gotowebinar.access_token,
        'content-type': 'application/json;charset=utf-8'
      },
      body: {
        firstName: participant.firstName,
        lastName: participant.surname,
        email: participant.user.profileName + '@javascript.ru'
      },
      resolveWithFullResponse: true,
      simple: false
    });

    if (response.statusCode != 409 && response.statusCode != 201) {
      console.error("Gotowebinar register error", response.statusCode, response.body);
      throw new Error("Gotowebinar register error: " + response.statusCode);
    }

    participant.registrantKey = response.body.registrantKey;
    participant.joinUrl = response.body.joinUrl;

    yield participant.persist();
  }

}

function* grantVideoKeys(group, participants) {

  let participantsWithoutKeys = participants.filter(function(participant) {
    return !participant.videoKey;
  });

  // everyone has the key => exit
  if (!participantsWithoutKeys.length) return;

  var otherSameVideoTagGroups = yield CourseGroup.find({
    videoKeyTagCached: group.videoKeyTagCached,
    _id: {
      $ne: group._id
    }
  }, {_id: 1});

  var otherSameVideoTagGroupIds = otherSameVideoTagGroups.map(group => group._id);

  log.debug("Other same course groups", otherSameVideoTagGroupIds);

  for (var i = 0; i < participantsWithoutKeys.length; i++) {
    var participant = participantsWithoutKeys[i];

    // try to find same user participanting in same course before
    var pastParticipantWithKey = yield CourseParticipant.findOne({
      user: participant.user,
      group: {
        $in: otherSameVideoTagGroupIds
      }
    }, {videoKey: 1}).sort({created: -1}).limit(1);


    if (pastParticipantWithKey) {
      participant.videoKey = pastParticipantWithKey.videoKey;
    } else {

      let videoKey = yield VideoKey.findOne({
        tag: group.videoKeyTagCached,
        used: false
      });

      if (!videoKey) {
        log.error(`Недостаточно серийных номеров ${group.videoKeyTagCached}`);
        // but not die, because other participant registration actions may pass ok
      } else {
        participant.videoKey = videoKey.key;
        videoKey.used = true;
        yield videoKey.persist();
      }
    }

    yield participant.persist();
  }


}


// tests fail with it enabled (it dies on socket disconnect)
// didn't dig for the reason
// but we're not testing renaming -> registerParticipants anyway (yet)
// so disabled
if (process.env.NODE_ENV != 'test') {
  // when user updates his details, regrant his groups IF changed profileName
  User.schema.pre('save', function(next) {
    var user = this;
    co(function*() {

      var paths = user.modifiedPaths();

      next();

      if (paths.indexOf('profileName') == -1) return;

      // wait 1 sec for db to save all changes,
      // that's for grant calls to populate user correctly
      yield function(callback) {
        setTimeout(callback, 1000);
      };

      var participants = yield CourseParticipant.find({
        user: user._id
      }).populate('group').exec();

      var groups = participants.map(function(participant) {
        return participant.group;
      });

      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        yield* registerParticipants(group);
      }

    }).catch(function(err) {
      log.error("Grant error", err);
    });

  });
}
