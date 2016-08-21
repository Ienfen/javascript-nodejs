'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
require('./course'); // ensure Course exists
require('users'); // ensure User exists

// (teacher, course) pairs
var schema = new Schema({

  course: {
    type:     Schema.Types.ObjectId,
    ref:      'Course',
    required: true
  },

  teacher: {
    type: Schema.Types.ObjectId,
    ref:  'User',
    required: true
  },

  multipler: {
    type:  Number,
    required: true
  }

});

schema.index({teacher: 1, course: 1}, {unique: true});

module.exports = mongoose.model('CourseTeacher', schema);

