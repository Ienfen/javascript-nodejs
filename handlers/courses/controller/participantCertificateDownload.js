var config = require('config');
var CourseParticipant = require('../models/courseParticipant');
var CourseGroup = require('../models/courseGroup');
var _ = require('lodash');
var moment = require('momentWithLocale');
var path = require('path');
var mongoose = require('mongoose');
var exec = require('mz/child_process').exec;


const t = require('i18n');

const LANG = require('config').lang;

t.requirePhrase('courses.cert', require('../locales/cert/' + LANG + '.yml'));

// Group info for a participant, with user instructions on how to login
exports.get = function*() {

  var id = this.params.participantId;

  try {
    new mongoose.Types.ObjectId(id);
  } catch (e) {
    // cast error (invalid id)
    this.throw(404);
  }

  var participant = yield CourseParticipant.findOne({
    _id: id,
    isActive: true
  }).populate('group');

  if (!participant) {
    this.throw(404);
  }

  if (String(participant.user) != String(this.user._id)) {
    this.throw(403);
  }
  yield CourseGroup.populate(participant.group, {path: 'course'});

  var dateStart = moment(participant.group.dateStart).format('DD.MM.YYYY');
  var dateEnd = moment(participant.group.dateEnd).format('DD.MM.YYYY');

  var cmd = `convert ${config.projectRoot}/extra/courses/cert-blank-${LANG}-300dpi.jpg \
    -font ${config.projectRoot}/extra/courses/font/calibri.ttf -pointsize 70 \
   -annotate +900+1050 '${t('courses.cert.line1', {dateStart, dateEnd})}' \
   -fill "#7F0000" -pointsize 140 -annotate +900+1250 '${participant.fullName}' \
   -fill black -pointsize 70 -annotate +900+1400 '${t('courses.cert.line2')}' \
   -fill black -pointsize 70 -annotate +900+1500 '"${participant.group.course.title}"' \
    jpeg:-`;

  this.log.debug(cmd);
  /*
   var cmd = `/opt/local/bin/convert ${config.projectRoot}/extra/courses/cert-blank-600dpi.jpg \
   -font ${config.projectRoot}/extra/courses/font/calibri.ttf -pointsize 140 \
   -annotate +1800+2100 'Настоящим удостоверяется, что с ${dateStart} по ${dateEnd}' \
   -fill "#7F0000" -pointsize 280 -annotate +1800+2500 '${participant.fullName}' \
   -fill black -pointsize 140 -annotate +1800+2800 'прошёл(а) обучение по программе' \
   -fill black -pointsize 140 -annotate +1800+3000 '${participant.group.course.title}' \
   -`;*/

  let [stdout, stderr] = yield exec(cmd, {
    encoding:  'buffer',
    timeout:   10000,
    maxBuffer: 50 * 1024 * 1025
  });

  if (stderr.length) {
    throw new Error(stderr.toString());
  }

  this.set({
    'Content-Type': 'image/jpeg'
  });


  this.body = stdout;
};
