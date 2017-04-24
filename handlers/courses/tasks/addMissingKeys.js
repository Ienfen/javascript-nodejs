'use strict';

const path = require('path');
const config = require('config');
const co = require('co');
const yargs = require('yargs');

const CourseGroup = require('../models/courseGroup');
const CourseParticipant = require('../models/courseParticipant');
const request = require('request-promise');

const VideoKey = require('videoKey').VideoKey;


module.exports = function() {

  return function() {

    return co(function*() {
      let participants = yield CourseParticipant.find({
        videoKey: {
          $not: {
            $exists: true
          }
        }
      }).populate('group');

      console.log("Found participants", participants);

      for (let participant of participants) {

        let videoKey = yield VideoKey.findOne({
          tag: participant.group.videoKeyTagCached,
          used: false
        });

        if (!videoKey) {
          throw new Error("NO KEYS");
        }
        participant.videoKey = videoKey.key;
        videoKey.used = true;
        yield videoKey.persist();
        yield participant.persist();

      }


    });

  };

};
