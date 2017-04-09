let crypto = require('crypto');
let config = require('config');
let execSync = require('child_process').execSync;
let log = require('log')();

exports.post = function*() {

  let signature = this.get('x-hub-signature');
  let event = this.get('x-github-event');
  let id = this.get('x-github-delivery');

  if (!signature) {
    this.throw(400, 'No X-Hub-Signature found on request');
  }

  if (!event) {
    this.throw(400, 'No X-Github-Event found on request');
  }

  if (!id) {
    this.throw(400, 'No X-Github-Delivery found on request');
  }

  this.log.debug("github hook", {requestVerbose: this.request});

  // koa-bodyparser gives that
  console.log(this.request.rawBody);

  signature = signature.replace(/^sha1=/, '');
  let computedSignature = crypto.createHmac('sha1', Buffer.from(config.githubTutorialHook.secret, 'utf-8')).update(this.request.rawBody).digest('hex');

  this.log.debug("Compare signature", computedSignature, signature);
  if (computedSignature !== signature) {
    this.throw(400, 'X-Hub-Signature does not match blob signature');
  }

  this.log.debug("Hook data", this.request.body);

  let branch = this.request.body.ref.split('/').pop();

  if (branch == config.lang) {
    this.log.debug("reimport tutorial");
    yield* importTutorial();
  }

  this.body = {ok: true};
};


function* importTutorial(branch) {
  let env = {
    NODE_ENV: 'production',
    NODE_LANG: branch
  };

  execSync(`git pull origin ${branch}`, {cwd: '/js/javascript-tutorial'});
  execSync(`git checkout ${branch}`, {cwd: '/js/javascript-tutorial'});

  return;
  let cmd = `npm --silent run gulp -- tutorial:remoteUpdate --host learn-${branch} --root /js/javascript-tutorial`;
  execSync(cmd);
}


function exec(...args) {
  log.info(...args);
  return execSync(...args);
}