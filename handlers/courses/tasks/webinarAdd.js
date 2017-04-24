'use strict';

const path = require('path');
const config = require('config');
const co = require('co');
const yargs = require('yargs');

const CourseGroup = require('../models/courseGroup');
const request = require('request-promise');
const webinarAdd = require('../lib/webinarAdd');

module.exports = function() {

  return function() {

    const argv = require('yargs')
      .usage('gulp courses:webinarAdd --group js-1')
      .describe('group', 'Group slug')
      .demand(['group'])
      .argv;

    return co(function*() {
      var group = yield CourseGroup.findOne({
        slug: argv.group
      }).populate('course teacher');

      if (!group) {
        throw new Error("No group:" + argv.group);
      }

      yield* webinarAdd(group);

    });

  };

};
