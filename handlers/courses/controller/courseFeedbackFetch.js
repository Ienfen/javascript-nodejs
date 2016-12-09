'use strict';

const mongoose = require('mongoose');
const countries = require('countries');
const CourseFeedback = require('../models/courseFeedback');
const CourseGroup = require('../models/courseGroup');
const Course = require('../models/course');
const renderFeedback = require('../lib/renderFeedback');

exports.get = function*() {

  var skip = +this.query.skip || 0;
  var limit = 10;

  var filter = {};

  // for non-admin user filter isPublic
  if (!this.user || !this.user.hasRole('admin')) {
    filter.$or = [{
      isPublic: true
    }];

    // or his groups
    if (this.user) {
      filter.$or.push({
        teacherCache: this.user._id
      });
    }
  }

  if (this.query.course) {

    var course = yield Course.findOne({
      slug: this.query.course
    });

    if (!course) {
      this.throw(404);
    }

    filter.courseCache = course._id;
  }

  if (this.query.teacherId) {
    if (!mongoose.Types.ObjectId.isValid(this.query.teacherId)) {
      this.throw(400, "teacherId is malformed");
    }
    filter.teacherCache = new mongoose.Types.ObjectId(this.query.teacherId);
  }

  if (this.query.stars) {
    filter.stars = +this.query.stars;
  }

  let feedbacks = yield CourseFeedback.find(filter).sort({created: -1}).skip(skip).limit(limit);


  let feedbacksRendered = [];

  for (var i = 0; i < feedbacks.length; i++) {
    var feedback = feedbacks[i];

    feedbacksRendered.push(yield* renderFeedback(feedback, {user: this.user}));
  }

  this.locals.countries = countries.all;

  var html = this.render('feedback/listItems', {
    courseFeedbacks: feedbacksRendered,
    isList:          true
  });

  let response = {
    html,
    count:   feedbacks.length,
    hasMore: feedbacks.length == limit
  };

  if (this.query.needTotal) {
    response.total = yield CourseFeedback.count(filter);
  }

  this.body = response;
};

