const mongoose = require('mongoose');
var oid = require('oid');

var User = require('users').User;

exports.User = [{
  "_id":         oid('user-tester'),
  email:         "mk@javascript.ru",
  displayName:   "Tester",
  profileName:   'tester',
  password:      "123456",
  verifiedEmail: true
}, {
  "_id":          oid('user-iliakan'),
  email:          "iliakan@javascript.ru",
  displayName:    "Ilya Kantor",
  profileName:    'iliakan',
  password:       "123456",
  profileTabsEnabled: ["courses"],
  roles:        ['admin'],
  verifiedEmail:  true
}, {
  "_id":          oid('user-szelenov'),
  email:          "s.zelenov@javascript.ru",
  displayName:    "Sergey Zelenov",
  profileName:    'szelenov',
  password:       "123456",
  profileTabsEnabled: ["courses"],
  roles:        ['admin'],
  verifiedEmail:  true
}];
