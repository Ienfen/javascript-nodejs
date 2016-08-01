'use strict';

const config = require('config');
require('lib/mongoose'); // the right mongoose for a standalone run

const co = require('co');
const crypto = require('crypto');
const log = require('log')();
const RtmClient = require('@slack/client').RtmClient;
const SlackUser = require('../models/slackUser');
const SlackChannel = require('../models/slackChannel');
const SlackChannelMember = require('../models/slackChannelMember');
const SlackMessage = require('../models/slackMessage');

const botWebClient = require('./client')(config.slack.bot.token);

const rtmClient = new RtmClient(config.slack.bot.token, {
  logLevel: process.env.NODE_ENV == 'development' ? 'debug' : 'info'
});

module.exports = class BotService {

  *start() {
    this.state = 'running';

    rtmClient.start();

    let self = this;

    function coHandler(handler) {
      return function(...args) {
        co(handler.apply(self, args)).catch(err => log.error(err));
      };
    }

    rtmClient.on('authenticated', coHandler(this.onAuthenticated));

    rtmClient.on('team_join', coHandler(this.onTeamJoin));

    // invited to group, happens before group_join
    rtmClient.on('group_joined', coHandler(this.onChannelJoined));
    rtmClient.on('group_left', coHandler(this.onChannelLeft));

    // invited to channel, happens before channel_join
    rtmClient.on('channel_joined', coHandler(this.onChannelJoined));
    rtmClient.on('channel_left', coHandler(this.onChannelLeft));

    rtmClient.on('team_join', coHandler(this.onTeamJoin));
    rtmClient.on('message', coHandler(this.onMessage));

    /*
     let emit = rtmClient.emit;
     rtmClient.emit = function() {
     console.log(arguments);
     return emit.apply(this, arguments);
     };*/

    yield new Promise(resolve => {
      this._stop = resolve;
    });

  }

  *onTeamJoin({user}) {
    yield* this.updateUsers([user]);

    /*
     let channel = yield botWebClient.im.open({
     user: user.id
     });
     */
    /*
     yield botWebClient.chat.postMessage({
     channel: '@' + user.name,
     as_user: false,
     parse: 'full',
     text: "Привет, привет!\n\nУ нас есть каналы:\n    - #general для общих вопросов по JavaScript.\n    - #angular, #react - для вопросов по фреймворкам.\n    - #nodejs - для вопросов по Node.JS.\n    - #jobs - для поиска работы и вакансий.\n\nЕсли вы в Slack впервые, то рекомендую посмотреть чего-как на странице https://learn.javascript.ru/slack/about."
     });
     */

    yield botWebClient.chat.postMessage(
      '@' + user.name,
      "Привет, привет!\n\nУ нас есть каналы:\n    - #general для общих вопросов по JavaScript.\n    - #angular, #react, #vue - для вопросов по фреймворкам.\n    - #typescript для TypeScript.\n    - #nodejs - для вопросов по Node.JS.\n    - #jobs - для поиска работы и вакансий.\n\nЕсли вы в Slack впервые, то рекомендую посмотреть чего-как на странице https://learn.javascript.ru/welcome-to-slack.", {
        as_user: false,
        parse: 'full'
      }
    );
  }

  *onChannelJoined({channel}) {
    yield* this.insertChannel(channel);
  }

  *onChannelLeft({channel: channelId}) {
    yield* this.removeChannelById(channelId);
  }

  *onMessage(message) {
    if (message.user === config.slack.bot.id) return;

    // join
    if (
      message.subtype == 'channel_join' ||
      message.subtype == 'group_join'
    ) {
      yield* this.joinMessageHandler(message);
      return;
    }

    // leave
    if (
      message.subtype == 'channel_leave' ||
      message.subtype == 'group_leave'
    ) {
      yield* this.leaveMessageHandler(message);
      return;
    }

    // message from user
    if (
      !message.subtype ||
      message.subtype === 'file_share'
    ) {
      yield* this.userMessageHandler(message);
      return;
    }

  }

  *insertChannel(channel) {
    let channelId = channel.id;

    yield* this.removeChannelById(channelId);

    yield SlackChannel.fromSlack(channel).persist();

    let entries = channel.members.map(userId => ({
      channelId, userId
    }));

    yield SlackChannelMember.collection.insertMany(entries);
  }

  *removeChannelById(channelId) {
    yield SlackChannel.remove({channelId});
    yield SlackChannelMember.remove({channelId});
  }


  *onAuthenticated(response) {
    let users = response.users;

    yield* this.updateUsers(users);

    let channels = response.channels.concat(response.groups);

    for (let i = 0; i < channels.length; i++) {
      let channel = channels[i];

      if (channel.is_member === false) continue;

      yield* this.insertChannel(channel);

    }

  }

  *updateUsers(users) {
    let commands = users.map(user => ({
      updateOne: {
        filter: {userId: user.id},
        update: SlackUser.readSlack(user),
        upsert: true
      }
    }));

    yield SlackUser.collection.bulkWrite(commands);

  }

  *onJoinMessageHandler(message) {
    let channel = yield SlackChannel.findOne({
      channelId: message.channel
    });

    if (!channel) {
      throw new Error("No channel " + message.channel);
    }

    yield SlackChannelMember.create({
      channelId: message.channel,
      userId:    message.user
    });
  }

  *onLeaveMessageHandler(message) {
    yield SlackChannelMember.remove({
      channelId: message.channel,
      userId:    message.user
    });
  }

  *userMessageHandler(message) {
    // https://api.slack.com/events/message
    yield SlackMessage.create({
      channelId: message.channel,
      userId: message.user,
      text: message.text,
      date: new Date(message.ts * 1000)
    });
  }

  stop() {
    rtmClient.disconnect();
    this._stop();
  }

};

/*
 { '0': 'raw_message',
 '1': '{"type":"team_join","user":{"id":"U1J1XDFLG","team_id":"T0K8GCXT9","name":"test-1","deleted":false,"status":null,"color":"8d4b84","real_name":"Test1 test1","tz":"Asia/Kuwait","tz_label":"Arabia Standard Time","tz_offset":10800,"profile":{"first_name":"Test1","last_name":"test1","avatar_hash":"g3df8e0adcac","real_name":"Test1 test1","real_name_normalized":"Test1 test1","email":"c4317021@trbvn.com","image_24":"https://secure.gravatar.com/avatar/3df8e0adcac6bf62cd41987c311eca26.jpg?s=24&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0019-24.png","image_32":"https://secure.gravatar.com/avatar/3df8e0adcac6bf62cd41987c311eca26.jpg?s=32&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0019-32.png","image_48":"https://secure.gravatar.com/avatar/3df8e0adcac6bf62cd41987c311eca26.jpg?s=48&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0019-48.png","image_72":"https://secure.gravatar.com/avatar/3df8e0adcac6bf62cd41987c311eca26.jpg?s=72&d=https%3A%2F%2Fa.slack-edge.com%2F66f9%2Fimg%2Favatars%2Fava_0019-72.png","image_192":"https://secure.gravatar.com/avatar/3df8e0adcac6bf62cd41987c311eca26.jpg?s=192&d=https%3A%2F%2Fa.slack-edge.com%2F7fa9%2Fimg%2Favatars%2Fava_0019-192.png","image_512":"https://secure.gravatar.com/avatar/3df8e0adcac6bf62cd41987c311eca26.jpg?s=512&d=https%3A%2F%2Fa.slack-edge.com%2F7fa9%2Fimg%2Favatars%2Fava_0019-512.png","fields":null},"is_admin":false,"is_owner":false,"is_primary_owner":false,"is_restricted":false,"is_ultra_restricted":false,"is_bot":false,"presence":"away"},"cache_ts":1466194316}' }
 { '0': 'team_join',
 '1':
 { type: 'team_join',
 user:
 { id: 'U1J1XDFLG',
 team_id: 'T0K8GCXT9',
 name: 'test-1',
 deleted: false,
 status: null,
 color: '8d4b84',
 real_name: 'Test1 test1',
 tz: 'Asia/Kuwait',
 tz_label: 'Arabia Standard Time',
 tz_offset: 10800,
 profile: [Object],
 is_admin: false,
 is_owner: false,
 is_primary_owner: false,
 is_restricted: false,
 is_ultra_restricted: false,
 is_bot: false,
 presence: 'away' },
 cache_ts: 1466194316 } }
*/
