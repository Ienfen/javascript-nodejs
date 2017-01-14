var co = require('co');
var readHostFromSSHConfig = require('../lib/readHostFromSSHConfig');
var sshConnect = require('../lib/sshConnect');
var sshExec = require('../lib/sshExec');
var config = require('config');
var gutil = require('gulp-util');

/**
 * Update host working site to production
 * @returns {Function}
 */
module.exports = function() {

  var args = require('yargs')
    .example('gulp deploy:update --host learn-ru')
    .demand(['host'])
    .argv;

  return function() {

    return co(function*() {

      var client = yield* sshConnect(args.host);

      try {
        yield* client.runInTarget(`git reset --hard`);
        yield* client.runInTarget(`git fetch origin ${config.deploy.productionBranch}`);
        yield* client.runInTarget(`git merge origin/${config.deploy.productionBranch} --no-edit`);

        // if there any migrations, this will stop the server and apply them
        yield* client.runInTarget(`npm --silent run gulp deploy:migrate`);

        // NODE_LANG=en /usr/local/bin/pm2 startOrGracefulReload ecosystem.json --env learn-en --only javascript
        yield* client.runInTarget(`/etc/init.d/pm2-init.sh reload`);
        yield* client.runInTarget(`npm --silent run gulp cache:clean`);
        yield* client.runInTarget(`npm --silent run gulp cloudflare:clean | bunyan`);
        if (args.withNginx) {
          yield* client.runInTarget(`npm --silent run -- gulp config:nginx --prefix /etc/nginx --env production --root /js/javascript-nodejs --sslEnabled`);
          yield* client.runInTarget(`/etc/init.d/nginx reload`);
        }
      } finally {
        client.end();
      }

    });

  };
};

