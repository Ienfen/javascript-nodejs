'use strict';

const mongoose = require('lib/mongoose');

const schema = new mongoose.Schema({
  channelId:  {
    type:     String,
    required: true,
    index:    true
  },
  userId:  {
    type:     String,
    required: true,
    index:    true
  },
  text: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  }
});

schema.index({userId: 1, channelId: 1, date: 1});

module.exports = mongoose.model('SlackMessage', schema);
