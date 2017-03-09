var co = require('co');
var VideoKey = require('../models/videoKey');
var fs = require('fs');
var gutil = require('gulp-util');
let request = require('request-promise');
let VideoKeyProject = require('../models/videoKeyProject');
let Order = require('payments').Order;
let CourseInvite = require('courses').CourseInvite;

/**
 * Load keys from file, split by \n
 * @param options
 * @returns {Function}
 */
module.exports = function(options) {

  return function() {

    var args = require('yargs')
      .example("gulp videoKey:addActivation --tag js --serial abcdef --count 5")
      .example("gulp videoKey:addActivation --order 1234 --count 5")
      .argv;

    return co(function* () {

      if (args.tag && args.serial) {
        let project = yield VideoKeyProject.findOne({tag: args.tag});

        if (!project) {
          gutil.log("ERROR: no such project:" + args.tag);
        }

        let result = yield request({
          method:   'POST',
          url:      'https://api.infoprotector.com/user/serial',
          formData: {
            api_key:          project.apiKey,
            serial:           args.serial,
            activation_count: args.count || 5
          }
        });

        console.log(result);
      } else if (args.order) {
        let order = yield Order.findOne({
          number: args.order
        });

        if (!order) {
          throw new Error("No such order:" + args.order);
        }

        let invite = yield CourseInvite.findOne({
          order: order._id
        }).populate('participant');

        gutil.log("videoKey:" + invite.participant.videoKey);

        let videoKey = yield VideoKey.findOne({key: invite.participant.videoKey}).populate('project');

        console.log(videoKey);


        let result = yield request({
          method:   'POST',
          url:      'https://api.infoprotector.com/user/serial',
          formData: {
            api_key:          videoKey.project.apiKey,
            serial:           videoKey.key,
            activation_count: args.count || 5
          }
        });

        console.log(result);
      }
    });


  };
};
