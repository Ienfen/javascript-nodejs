let crypto = require('crypto');
let config = require('config');

function signBlob(key, blob) {
  return 'sha1=' + crypto.createHmac('sha1', key).update(blob).digest('hex');
}

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

  var computedSig = new Buffer(signBlob(config.github.secret, this.request.rawBody))

  this.log.debug("Compare signature", computedSig, signature);
  if (!computedSig.equals(signature)) {
    this.throw(400, 'X-Hub-Signature does not match blob signature');
  }

  this.log.debug("Hook data", this.request.body);

  this.body = {ok: true};
};