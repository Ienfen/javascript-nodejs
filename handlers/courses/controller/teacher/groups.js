'use strict';

const path = require('path');
const multiparty = require('multiparty');
const config = require('config');
const fs = require('mz/fs');

const CourseTeacher = require('../../models/courseTeacher');
const CourseParticipant = require('../../models/courseParticipant');
const CourseGroup = require('../../models/courseGroup');
const Course = require('../../models/course');
const moment = require('momentWithLocale');
const stripTags = require('textUtil/stripTags');
const webinarAdd = require('../../lib/webinarAdd');
const slackAdd = require('../../lib/slackAdd');
let getUserSidebar = require('admin').getUserSidebar;
var getGroupAmount = require('../../lib/getGroupAmount');
var getGroupOrderCounts = require('../../lib/getGroupOrderCounts');

exports.get = function*() {

  let groups = yield CourseGroup.find({
    teacher: this.user,
  }).populate('course').sort({isArchvied: 1, dateEnd: -1});

  this.locals.groups = [];

  this.locals.sidebar = yield* getUserSidebar(this.user);

  for (let i = 0; i < groups.length; i++) {
    let group = groups[i];

    let courseTeacher = yield CourseTeacher.findOne({
      course: group.course._id,
      teacher: group.teacher
    });

    if (!courseTeacher) {
      this.log.error("No courseTeacher for ", group.id);
    }

    let amount = yield* getGroupAmount(group);

    this.locals.groups.push({
      orderCount: yield* getGroupOrderCounts(group),
      participantCount: yield CourseParticipant.count({group: group._id}),
      amount: amount,
      teacher: group.teacher,
      slug: group.slug,
      dateStart: group.dateStart,
      dateEnd: group.dateEnd,
      isArchived: group.isArchived,
      teacherAgreement: group.teacherAgreement,
      agreementNumber: moment(group.dateStart).format('YYYYMMDDHHmm')
    });
  }

  this.body = this.render('teacher/groups');
};

