const moment = require('momentWithLocale');

const {
  SlackUser,
  SlackChannel,
  SlackMessage
} = require('slack');

const { parseMessages } = require('../lib/slackMessages');

exports.get = function* (next) {
  const group = this.groupBySlug;
  const { id } = group.slackGroup;

  // 2016-08-22
  const { date } = this.query;

  const startOfDay = moment(
    date ?
      new Date(date) :
      new Date()
  ).startOf('day').toDate();

  const endOfDay = moment(startOfDay).endOf('day').toDate();

  const messages = yield SlackMessage.find({
    channelId: id,
    date: { $gte: startOfDay, $lte: endOfDay }
  }).sort({ ts: 1 }).populate('author');

  console.log(messages);

  yield* parseMessages(messages);

  this.locals = Object.assign({}, this.locals, {
    group,
    messages,
    date: moment(startOfDay).format('MMMM, D YYYY')
  });

  this.body = this.render('groupChatLogs');
};
