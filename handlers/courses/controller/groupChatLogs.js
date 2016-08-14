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

  const startDate = date ?
    new Date(date) :
    new Date(created * 1000);

  const endDate = moment(dayForSearch).endOf('day').toDate();

  // TODO: extend this objects `user` field
  const messages = yield SlackMessage.find({
    channelId: id,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ ts: 1 });

  this.locals = {
    title,
    day: moment(startDate).format('ddd, DD MM YYYY')
  };

  this.body = this.render('groupChatLogs');
};
