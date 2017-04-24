var co = require('co');
var VideoKey = require('../models/videoKey');
var VideoKeyProject = require('../models/videoKeyProject');
var fs = require('fs');
var gutil = require('gulp-util');

/**
 * Load keys from file, split by \n
 * @param options
 * @returns {Function}
 */
module.exports = function(options) {

  return function() {

    var args = require('yargs')
      .example("gulp videoKey:load --from file.txt --tag js")
      .demand(['from', 'tag'])
      .argv;

    return co(function* () {

      let project = yield VideoKeyProject.findOne({tag: args.tag});

      if (!project) {
        throw new Error("No project");
      }

      var keys = fs.readFileSync(args.from, 'utf-8').trim().split("\n");

      var inserted = 0;
      for (var i = 0; i < keys.length; i++) {

        try {
          yield new VideoKey({
            key: keys[i],
            tag: args.tag,
            project: project._id
          }).persist();
          inserted++;
        } catch (e) {
          if (e.code != 11000) throw e; // ignore uniqueness errors
        }

      }

      gutil.log("Inserted", inserted, "of", keys.length);

    });


  };
};
