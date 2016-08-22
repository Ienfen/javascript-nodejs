const moment = require('momentWithLocale');

const {
  SlackUser,
  SlackChannel,
  SlackMessage
} = require('slack');

const { parseMessages } = require('../lib/slackMessages');

exports.get = function* (next) {
  const group = this.groupBySlug;
  const { id, created } = group.slackGroup;

  // 08.14.2016
  const { date } = this.query;

  const createdDate = new Date(created * 1000);

  const startOfDay = date ?
    new Date(date) :
    createdDate;

  const endOfDay = moment(startOfDay).endOf('day').toDate();

  const messages = yield SlackMessage.find({
    channelId: id,
    date: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ ts: 1 }).populate('author');

  yield* parseMessages(messages);

  this.locals = Object.assign({}, this.locals, {
    group,
    messages,
    date: moment(startOfDay).format('MMMM, D YYYY')
  });

  this.body = this.render('groupChatLogs');
};
