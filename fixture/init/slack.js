const mongoose = require('mongoose');

const {
  SlackUser,
  SlackChannel,
  SlackMessage
} = require('slack');

exports.SlackChannel = [
  {
    channelId: "CHANNELID",
    isGroup: true,
    isGeneral: true,
    isArchived: false,
    name: 'nodejs-20160901'
  }
];

exports.SlackUser = [
  {
    userId : "USERID1",
    realName : "Ilya Kantor",
    isBot: false,
    isAdmin: true,
    deleted: false,
    name: 'iliakan',
    teamId: '1'
  },
  {
    userId : "USERID2",
    realName : "Sergey Zelenov",
    isBot: false,
    isAdmin: true,
    deleted: false,
    name: 's.zelenov',
    teamId: '2'
  }
];

exports.SlackMessage = [
  {
    channelId: 'CHANNELID',
    userId: 'USERID1',
    type: 'user_message',
    text: 'hi <@USERID2>',
    ts: '1',
    date: new Date('2016-09-20T15:37:17Z')
  },
  {
    channelId: 'CHANNELID',
    userId: 'USERID2',
    type: 'user_message',
    text: 'hi <@USERID1>',
    ts: '2',
    date: new Date('2016-09-20T15:38:17Z')
  },
  {
    channelId: 'CHANNELID',
    userId: 'USERID1',
    type: 'user_message',
    text: 'what do you think about my code?\n\n ```\nconst a = 5;\nalert(a);\n```',
    ts: '3',
    date: new Date('2016-09-20T15:39:17Z')
  },
  {
    channelId: 'CHANNELID',
    userId: 'USERID2',
    type: 'user_message',
    text: '<@USERID2> :slightly_smiling_face:',
    ts: '4',
    date: new Date('2016-09-20T15:40:17Z')
  },
  {
    channelId: 'CHANNELID',
    userId: 'USERID1',
    type: 'user_message',
    text: `thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot,
          thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, thanks a lot, `,
    ts: '5',
    date: new Date('2016-09-20T15:41:17Z')
  },
  {
    channelId: 'CHANNELID',
    userId: 'USERID1',
    type: 'user_message',
    ts: '6',
    date: new Date('2016-09-20T15:43:17Z'),
    attachments: [
      {
        fallback: '[September 11th, 2016 10:00 PM] iliakan: test2',
        ts: '2',
        author_subname: 'iliakan',
        channel_id: 'CHANNELID',
        channel_name: 'nodejs-20160901',
        is_msg_unfurl: true,
        text: 'test2',
        author_name: 'Ilya Kantor',
        author_link: 'https://javascriptru.slack.com/team/iliakan',
        author_icon: 'https://avatars.slack-edge.com/2016-03-19/27919774147_b5a20595fb0a14558471_48.jpg',
        color: 'D0D0D0',
        from_url: 'https://javascriptru.slack.com/archives/bot-test/p1473620457000014',
        is_share: true,
        footer: 'Posted in #bot-test'
      }
    ]
  },
  {
    channelId: 'CHANNELID',
    userId: 'USERID1',
    type: 'user_message',
    text: 'what do you think about my code?\n\n ```\nconst a = 5;\nalert(a);\n```',
    ts: '7',
    attachments: [
      {
        fallback: "New ticket from Andrea Lee - Ticket #1943: Can\'t rest my password - https://groove.hq/path/to/ticket/1943",
        pretext: "New ticket from Andrea Lee",
        title: "Ticket #1943: Can\'t reset my password",
        title_link: "https://groove.hq/path/to/ticket/1943",
        text: "Help! I tried to reset my password but nothing happened!",
        color: "#7CD197"
      }
    ],
    date: new Date('2016-09-20T15:44:17Z')
  },
];
