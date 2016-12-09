"use strict";

const mongoose = require('mongoose');
const countries = require('countries');
const CourseFeedback = require('../models/courseFeedback');
const CourseParticipant = require('../models/courseParticipant');
const CourseGroup = require('../models/courseGroup');
const User = require('users').User;
const _ = require('lodash');
const BasicParser = require('markit').BasicParser;
const CacheEntry = require('cache').CacheEntry;

module.exports = function*(courseFeedback, {user, cut} = {}) {

  var doRender = renderFeedback.bind(null, courseFeedback, {user, cut});

  if (user) {
    if (courseFeedback.userCache.equals(user._id) || user.hasRole('admin') || user.hasRole('teacher')) {
      return yield* doRender();
    }
  }

  return yield* CacheEntry.getOrGenerate({
    key:  'coursefeedback:' + courseFeedback.number + ':' + Boolean(cut),
    tags: ['coursefeedback']
  }, doRender);


};

function* renderFeedback(courseFeedback, {user, cut} = {}) {
  yield CourseFeedback.populate(courseFeedback, 'group participant');
  yield CourseGroup.populate(courseFeedback.group, 'course teacher');
  yield CourseParticipant.populate(courseFeedback.participant, "user");

  var authorOrAdmin = false;
  if (user) {
    if (user.hasRole('admin') || user._id.equals(courseFeedback.participant.user._id)) {
      authorOrAdmin = true;
    }
  }

  var isTeacherOrAdmin = user && (user.hasRole('admin') || user._id.equals(courseFeedback.group.teacher._id));

  var rendered = {
    photo:             courseFeedback.photo || courseFeedback.participant.user.getPhotoUrl(),
    author:            {
      userId: courseFeedback.participant.user._id,
      link:   courseFeedback.participant.user.getProfileUrl(),
      name:   courseFeedback.participant.fullName
    },
    country:           courseFeedback.country,
    city:              courseFeedback.city,
    created:           courseFeedback.created,
    aboutLink:         courseFeedback.aboutLink,
    stars:             courseFeedback.stars,
    recommend:         courseFeedback.recommend,
    course:            {
      link:       courseFeedback.group.course.getUrl(),
      titleShort: courseFeedback.group.course.titleShort || courseFeedback.group.course.title,
      title:      courseFeedback.group.course.title
    },
    teacher:           {
      link: courseFeedback.group.teacher.getProfileUrl(),
      displayName: courseFeedback.group.teacher.displayName
    },
    hasCut:            courseFeedback.content.includes('[cut]'),
    content:           new BasicParser().render(cut ? courseFeedback.content.replace(/\[cut\][\s\S]*/, '') : courseFeedback.content),
    isTeacherOrAdmin:  isTeacherOrAdmin,
    isPublic:          courseFeedback.isPublic,
    number:            courseFeedback.number,
    teacherComment:    courseFeedback.teacherComment ? new BasicParser().render(courseFeedback.teacherComment) : '',
    teacherCommentRaw: isTeacherOrAdmin ? (courseFeedback.teacherComment || '') : '',
    editLink:          authorOrAdmin ? `/courses/feedback/edit/${courseFeedback.number}` : null,
    link:              `/courses/feedback/${courseFeedback.number}`
  };

  return rendered;

}
