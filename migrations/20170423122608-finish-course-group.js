'use strict';

const CourseGroup = require('courses').CourseGroup;

exports.up = function*() {
  
  const finishedGroups = CourseGroup.find({
    dateEnd: { $lt: new Date(2017, 3, 24) } // 23 April 2017
  });
  
  yield Promise.all(finishedGroups.map(group => {
    group.isFinished = true;

    return group.save();
  }));
  
};

exports.down = function*() {
  throw new Error("Rollback not implemented");
};
