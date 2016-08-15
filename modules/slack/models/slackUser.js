'use strict';

const mongoose = require('lib/mongoose');

/**
 * SlackUser is independant from User,
 * because systems are independant
 * users can be created/deleted independantly and in any order
 * the linkage is usually done w/ email
 */
const schema = new mongoose.Schema({
  userId:   {
    type:     String,
    required: true,
    index: true
  },
  teamId:   {
    type:     String,
    required: true
  },
  name:     {
    type:     String,
    required: true
  },
  deleted:  {
    type:     Boolean,
    required: true
  },
  email:    {
    type: String,
    index: true
    // slackbot has no email
    // required: true
  },
  realName: {
    type:     String,
    required: true
  },
  isAdmin:  {
    type:     Boolean,
    required: true
  },
  isBot:    {
    type:     Boolean,
    required: true
  }
}, {
  timestamps: true
});


schema.index({userId: 1, teamId: 1}, {unique: true});

schema.statics.readSlack = function(user) {
  return {
    userId:   user.id,
    teamId:   user.team_id,
    name:     user.name,
    deleted:  user.deleted,
    email:    user.profile.email,
    realName: user.real_name,
    isAdmin:  user.is_admin,
    isBot:    user.is_bot
  };
};

schema.statics.fromSlack = function(user) {
  return new this(this.readSlack(user));
};

module.exports = mongoose.model('SlackUser', schema);
