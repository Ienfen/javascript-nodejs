const moment = require('momentWithLocale');
const _ = require('lodash');

const {
  SlackUser,
  SlackChannel,
  SlackMessage
} = require('slack');

exports.get = function* (next) {
  const group = this.groupBySlug;

  const messages = yield SlackMessage.find({
    channelId: group.slackGroup.id
  }).sort({ ts: 1 });

  console.log(messages);

  this.body = render('groupChatLogs');
};
