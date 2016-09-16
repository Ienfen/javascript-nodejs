'use strict';

const DropboxAccount = require('dropbox').DropboxAccount;
const getOauthRequestUrl = require('dropbox').getOauthRequestUrl;
const config = require('config');
const request = require('request-promise');
const CourseGroup = require('../models/courseGroup');

// http://localhost/courses/groups/dropbox-link?slug=js-20160602-2130
// -> http://localhost/courses/groups/js-20160602-2130/dropbox-share

// use ?slug= to pass group, because the same url is used for oauth-redirect
exports.get = function*() {

  let group = yield CourseGroup.findOne({
    slug: this.query.state || this.query.slug
  }).populate('teacher dropboxAccount');

  if (!group) {
    this.throw(404);
  }

  if (!group.teacher._id.equals(this.user._id) && !this.isAdmin) {
    this.throw(403, {info: 'Must be a teacher of this group or admin to link dropbox'});
  }

  if (group.dropboxAccount) {
    group.dropboxAccount = undefined;
    yield group.persist();
  }

  if (!this.query.code) {
    // initial request
    this.redirect(getOauthRequestUrl(group.slug, '/courses/groups/dropbox-link'));
    return;
  }

  // redirected back with auth code
  const formData = {
    code: this.query.code,
    grant_type: 'authorization_code',
    client_id: config.dropbox.key,
    client_secret: config.dropbox.secret,
    // can't use this.protocol, cause cloudflare proxies https->http
    redirect_uri: (this.host == 'localhost' ? 'http://' : 'https://') + this.host + this.originalUrl.split('?')[0]
  };

  this.log.debug('Dropbox oauth2/token', formData);

  let response = yield request.post({
    url: 'https://api.dropboxapi.com/oauth2/token',
    json: true,
    simple: false,
    formData: formData
  });

  this.log.debug(response);

  if (response.error) {
    this.log.error(response);
    this.throw(500, {info: response.error_summary});
  }


  let account = yield DropboxAccount.findOne({
    accountId: response.account_id
  });

  if (!account) {
    account = new DropboxAccount({
      accountId: response.account_id
    });
  }

  account.state = this.query.state;
  account.code = this.query.code;
  account.accessToken = response.access_token;

  yield* account.fetchCurrentAccount();

  yield account.persist();

  yield group.persist({
    dropboxAccount: account._id
  });

  this.body = "Dropbox-аккаунт " + account.email + " прилинкован к группе " + group.slug + '. Посетителям будет расшариваться директория ' + group.teacher.profileName;

};

