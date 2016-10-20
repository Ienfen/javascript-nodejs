'use strict';

const User = require('users').User;

exports.get = function* () {

  if (!(this.user && this.user.hasRole('admin')) && process.env.NODE_ENV != 'development') {
    this.throw(403);
  }

  let profileNameOrEmailOrId = this.params.profileNameOrEmailOrId || this.query.profileNameOrEmailOrId;

  if (!profileNameOrEmailOrId) {
    this.body = this.render('loginas-form');
    return;
  }

  let user = yield User.findOne({
    $or: [
      { profileName: profileNameOrEmailOrId },
      { displayName: profileNameOrEmailOrId },
      { email: profileNameOrEmailOrId.replace('--', '.') }
    ]
  });

  if (!user) {
    try {
      user = yield User.findById(profileNameOrEmailOrId).exec();
    } catch(e) {}
  }

  if (!user) this.throw(404);

  yield this.login(user);

  this.redirect('/');
};
