'use strict';

const mongoose = require('lib/mongoose');

const schema = new mongoose.Schema({
  channelId:  {
    type:     String,
    required: true,
    index: true
  },
  userId:  {
    type:     String,
    required: true,
    index: true
  },
  type: {
    type: String,
    // https://api.slack.com/events/message
    // originally called "subtype"
    enum: [
      'bot_message', /* 'channel_archive' */ 'channel_join',
      'channel_leave', 'channel_name', 'channel_purpose',
      'channel_topic', 'channel_unarchive', 'file_comment',
      'file_mention', 'file_share', /* 'group_archive' */
      'group_join', 'group_leave', 'group_name',
      'group_purpose', 'group_topic', 'me_message',
      'message_changed', 'message_deleted', 'pinned_item',
      'unpinned_item', 'user_message'
    ],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  ts: {
    type: String,
    required: true,
    index: true
  },
  hidden: {
    type: Boolean,
    default: false
  }
});

schema.index({user: 1, channel: 1, date: 1});

module.exports = mongoose.model('SlackMessage', schema);
