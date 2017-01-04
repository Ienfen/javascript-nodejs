'use strict';

const path = require('path');
const config = require('config');
const log = require('log')();
const request = require('request-promise');
const slackClient = require('slack').client();

module.exports = function*(group) {

  try {
    let response = yield slackClient.groups.create(group.slug);
    group.slackGroup = response.group;

  } catch(e) {
    if (e.message == 'name_taken') {
      // already exists
      let response = yield slackClient.groups.list();
      // Private channel names must be 21 characters or less.
      let existingGroup = response.groups.find(g => g.name == group.slug.slice(0, 21));
      group.slackGroup = existingGroup;
    } else {
      throw e;
    }

  }
  yield group.persist();

  yield slackClient.groups.invite(group.slackGroup.id, config.slack.bot.id);

};
