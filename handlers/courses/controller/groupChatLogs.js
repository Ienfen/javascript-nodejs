const moment = require('momentWithLocale');
const _ = require('lodash');

const {
  SlackUser,
  SlackChannel,
  SlackMessage
} = require('slack');

exports.get = function* (next) {
  const group = this.groupBySlug;
  const dateStart = moment(group.dateStart);

  const courseDurationInDays = moment(group.dateEnd).diff(dateStart, 'days');

  const dates = this.locals.dates = _.times(courseDurationInDays, num => {
    const date = moment(dateStart).add(num, 'd');

    return {
      date: date.format('D MMM YYYY')
    };
  });

  this.body = this.render('groupChatLogs');
};
