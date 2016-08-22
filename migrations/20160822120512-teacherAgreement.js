'use strict';


var CourseGroup = require('courses').CourseGroup;
var Course = require('courses').Course;
var User = require('users').User;
var CourseFeedback = require('courses').CourseFeedback;

exports.up = function*() {

  let number = 1;
  while(true) {
    let group = yield CourseGroup.findOne({
      number: {
        $exists: false
      }
    }).sort({dateStart: 1}).limit(1);

    if (!group) {
      break;
    }

    group.number = number++;

    if (group.dateEnd < new Date()) {
      group.isArchived = true;
    }

    yield group.persist();

  }

};

exports.down = function*() {
  throw new Error("Rollback not implemented");
};
