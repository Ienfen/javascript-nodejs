'use strict';

const path = require('path');
const multiparty = require('multiparty');
const config = require('config');
const fs = require('mz/fs');

const CourseTeacher = require('../../models/courseTeacher');
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

    this.locals.groups.push({
      orderCount: yield* getGroupOrderCounts(group),
      amount: yield* getGroupAmount(group),
      id: group.id,
      slug: group.slug,
      dateStart: group.dateStart,
      dateEnd: group.dateEnd,
      isArchived: group.isArchived,
      teacher: group.teacher
    });
  }

  this.body = this.render('teacher/groups');
};

