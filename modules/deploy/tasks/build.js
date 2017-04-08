var co = require('co');
var readHostFromSSHConfig = require('../lib/readHostFromSSHConfig');
var sshConnect = require('../lib/sshConnect');
var config = require('config');

/**
 * Update prod build dir from master, rebuild and commit to prod
 * @returns {Function}
 */
module.exports = function() {

  var args = require('yargs')
    .example('gulp deploy:build --host learn-ru')
    .example('gulp deploy:build --host learn-ru --with-npm')
    .example('gulp deploy:build --host learn-ru --no-build --no-test')
    .demand(['host'])
    .argv;

  return function() {

    return co(function*() {

      var client = yield* sshConnect(args.host);

      try {
        yield* client.runInBuild(`git reset --hard`);
        yield* client.runInBuild(`git fetch origin master`);
        yield* client.runInBuild(`git merge origin/master --no-edit`);

        if (args.withNpm) {
          yield* reinstallModules();
        }

        // unless --no-build
        if (args.build !== false) {
          //yield* client.runInBuild(`find node_modules -maxdepth 1 -type l -delete`); // delete handlers symlinks, gulp will recreate
          yield* client.runInBuild(`NODE_ENV=production ASSET_VERSIONING=file npm --silent run gulp build`);
          yield* client.runInBuild('git add -A --force public manifest');
        }

        // if there's nothing to commit,
        // `git commit` would exit with status 1, stopping the deploy
        // so I commit only if there are changes
        try {
          yield* client.runInBuild('git diff-index --quiet HEAD');
        } catch (e) {
          if (e.code == 1) {
            // exit code 1 means that there's something to commit
            yield* client.runInBuild('git commit -a -m deploy');
          }
        }


        // make sure tests pass unless --no-test
        if (args.test !== false) {
          yield* client.runInBuild(`npm test`);
        }

        yield* client.runInBuild('git push origin ' + config.deploy.productionBranch);
      } finally {
        client.end();
      }

      function* reinstallModules() {
        yield* client.runInBuild(`rm -rf node_modules`);
        yield* client.runInBuild(`npm install --no-progress`);
        yield* client.runInBuild('git add --force node_modules');
      }

    });

  };
};

