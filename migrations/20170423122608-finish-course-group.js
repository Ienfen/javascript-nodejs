'use strict';

const CourseGroup = require('course').courseGroup;

exports.up = function*() {
  
  const finishedGroups = CourseGroup.find({
    dateStart: { $lt: new Date(2017, 3, 23) } // 23 April 2017
  });
  
  yield Promise.all(finishedGroups.map(group => {
    group.isFinished = true;

    return group.save();
  }));
  
};

exports.down = function*() {
  throw new Error("Rollback not implemented");
};
