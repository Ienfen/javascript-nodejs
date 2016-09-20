'use strict';

const DropboxAccount = require('dropbox').DropboxAccount;
const shareFolder = require('dropbox').shareFolder;

exports.get = function*() {

  if (!this.groupBySlug.dropboxAccount) {
    this.throw(404, {info: 'У этой группы не включён Dropbox'});
  }

  this.locals.group = this.groupBySlug;

  this.body = this.render('groupDropboxShare');

};

exports.post = function*() {

  if (!this.groupBySlug.dropboxAccount) {
    this.throw(404, {info: 'У этой группы не включён Dropbox'});
  }

  let account = this.groupBySlug.dropboxAccount;

  yield* shareFolder({
    account,
    path: '/' + this.groupBySlug.teacher.profileName,
    email: this.request.body.email
  });

  this.locals.message = {
    html: "Готово, проверьте, в Dropbox должен быть инвайт. Он также придёт на email.",
    type: 'success'
  };

  this.body = this.render('/notification');
};
