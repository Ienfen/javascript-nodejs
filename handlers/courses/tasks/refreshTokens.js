'use strict';

const path = require('path');
const config = require('config');
const co = require('co');
const yargs = require('yargs');

const User = require('users').User;
const request = require('request-promise');

module.exports = function() {

  return function() {

    return co(function*() {

      let users = yield User.find({
        gotowebinar: {
          $exists: true
        }
      });

      for (let i = 0; i < users.length; i++) {
        let user = users[i];

        let response = yield request.post({
          url: 'https://api.citrixonline.com/oauth/access_token',
          json: true,
          headers: {
            'content-type': 'application/json;charset=utf-8'
          },
          body: {
            grant_type: 'refresh_token',
            client_id: config.gotowebinar.clientId,
            refresh_token: user.gotowebinar.refresh_token
          }
        });

        console.log(response);
        user.gotowebinar = response;
        yield user.persist();

      }

    });

  };

};
