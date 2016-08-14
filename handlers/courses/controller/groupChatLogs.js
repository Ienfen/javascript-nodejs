const moment = require('momentWithLocale');
const _ = require('lodash');

const {
  SlackUser,
  SlackChannel,
  SlackMessage
} = require('slack');

exports.get = function* (next) {
  const group = this.groupBySlug;

  // 08.14.2016
  const { date } = this.query;

  const { id, created, topic: { value: title } } = group.slackGroup;

  const dayForSearch = date ?
    (new Date(date).getTime()) / 1000 :
    created;

  // TODO: extend this objects `user` field
  const messages = yield SlackMessage.find({
    channelId: id,
    ts: { $regex: new RegExp(dayForSearch) }
  }).sort({ ts: 1 });

  this.locals = {
    title,
    day: moment(dayForSearch)
  };

  this.body = render('groupChatLogs');
};
