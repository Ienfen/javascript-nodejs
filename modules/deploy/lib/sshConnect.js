var Client = require('ssh2').Client;
var readHostFromSSHConfig = require('../lib/readHostFromSSHConfig');
var config = require('config');
var gutil = require('gulp-util');
var sshExec = require('./sshExec');

module.exports = function*(host) {

  var client = new Client();

  var sshHostConfig = yield* readHostFromSSHConfig(host);
  var host = sshHostConfig ? sshHostConfig.HostName : host;

  var options = {
    privateKey:   config.deploy.privateKey,
    user:         config.deploy.user,
    host:         host,
    // must forward agent to push from remote host to the "more remote" git repo
    agent:        process.env.SSH_AUTH_SOCK,
    agentForward: true
  };

  client.connect(options);

  yield function(callback) {
    client.on('ready', callback);
  };


  client.runInBuild = function(cmd, options) {
    return sshExec(client, `cd ${config.deploy.buildPath}; NODE_LANG=${config.lang} ${cmd}`, options);
  };

  client.run = function(cmd, options) {
    return sshExec(client, cmd, options);
  };

  client.runInTarget = function(cmd, options) {
    return sshExec(client, `cd ${config.deploy.targetPath}; NODE_LANG=${config.lang} ${cmd}`, options);
  };


  return client;
};
