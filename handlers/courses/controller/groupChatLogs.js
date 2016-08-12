const moment = require('momentWithLocale');
const _ = require('lodash');

const {
  SlackUser,
  SlackChannel,
  SlackMessage
} = require('slack');

exports.get = function* (next) {
  const group = this.groupBySlug;

  const slackChannel = yield SlackChannel.findOne({
    name: group.slug
  });

  const messages = yield SlackMessage.find({
    channelId: slackChannel.channelId
  }).sort({ ts: 1 });

  console.log(messages);

  this.body = render('groupChatLogs');
};
