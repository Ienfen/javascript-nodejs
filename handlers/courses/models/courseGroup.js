'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('config');
const fs = require('mz/fs');
const path = require('path');
const log = require('log')();
const validate = require('validate');
const CourseMaterial = require('./courseMaterial');
const timeReg = require('validate').patterns.time;
const moment = require('momentWithLocale');

require('./course'); // ensure Course exists
require('users'); // ensure User exists

const schema = new Schema({
  // 01.01.2015
  dateStart: {
    type:     Date,
    required: true
  },

  // 05.05.2015
  dateEnd:   {
    type:     Date,
    required: true
  },

  apiKey: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return parseInt(crypto.randomBytes(4).toString('hex'), 16).toString(36);
    }
  },

  datesSkip: {
    type: [Date],
    default: []
  },

  // [1, 4] for mon, thu
  weekDays: {
    type: [Number],
    default: []
  },

  timeStart: {
    type:     String,
    validate: {
      validator(value) {
        return timeReg.test(value);
      },
      message: 'Некорректное время начала'
    }
    // not enabling cause of old groups
    // required: true
  },

  teacherNotificationState: {
    type: {
      weekBeforeSent: Boolean,
      rightBeforeSent: Boolean,
      afterSent: Boolean,
      skip: Boolean
    },
    default: {}
  },

  dropboxAccount: {
    type: Schema.Types.ObjectId,
    ref: 'DropboxAccount'
  },

  timeEnd: {
    type:     String,
    validate: {
      validator(value) {
        return timeReg.test(value);
      },
      message: 'Некорректное время конца'
    }
    // for old groups
    // required: true
  },


  // DEPRECATED, for old groups
  duration: { // duration in minutes
    type: Number
  },

  // DEPRECATED, for old groups
  rrule:    {
    freq:  {
      type:      String,
      uppercase: true,
      default:   'WEEKLY'
    },
    byday: [{
      type:      String,
      uppercase: true,
      enum:      ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
    }]
  },


  // like "nodejs-0402", for urls
  slug: {
    type:     String,
    lowercase: true,
    required: true,
    unique:   true
  },

  price: {
    type:     Number,
    required: true
  },

  // Every mon and thu at 19:00 GMT+3
  timeDesc: {
    type:     String,
    required: true,
    trim:     true
  },

  // currently available places
  // decrease onPaid
  participantsLimit: {
    type:     Number,
    required: true
  },

  slackGroup: {},

  teacher: {
    type:     Schema.Types.ObjectId,
    ref:      'User',
    required: true
  },

  videoKeyTagCached: {
    type:  String,
    index: true
  },

  // group w/o materials can set this to undefined
  // otherwise there will be a link to the page (maybe without files yet)
  materials: {
    type:    [CourseMaterial.schema],
    default: []
  },

  // is this group in the open course list (otherwise hidden)?
  // even if not, the group is accessible by a direct link
  isListed: {
    type:     Boolean,
    required: true,
    default:  false
  },

  // is it possible to register?
  isOpenForSignup: {
    type:     Boolean,
    required: true,
    default:  false
  },

  // room jid AND gotowebinar id
  // an offline or unconfigured group may not have this
  webinarId: {
    type: String,
    trim: true
  },
  webinarKey: {
    type: String
  },

  skypeLink: {
    type: String,
    trim: true
  },

  course: {
    type:     Schema.Types.ObjectId,
    ref:      'Course',
    required: true
  },

  // JS/UI 10.01
  // a user-friendly group title
  title: {
    type:     String,
    required: true,
    trim:     true
  },

  created: {
    type:    Date,
    default: Date.now
  },

  isArchived: {
    type: Boolean,
    default: false
  }
});


schema.methods.getMaterialUrl = function(material) {
  return `/courses/download/${this.slug}/${material.filename}`;
};

schema.methods.getFeedbackUrl = function(material) {
  return `/courses/groups/${this.slug}/feedback`;
};

schema.methods.getMaterialFileRelativePath = function(material) {
  return `courses/${this.slug}/${material.filename}`;
};

schema.methods.getMaterialFilePath = function(material) {
  return path.join(config.downloadRoot, this.getMaterialFileRelativePath(material));
};

schema.methods.getMaterialFileSize = function* (material) {
  try {
    let stat = yield fs.stat(this.getMaterialFilePath(material));
    return stat.size;
  } catch (e) {
    return 0;
  }
};

schema.methods.getAllDates = function() {

  let dates = [];
  let datesSkipStrings = this.datesSkip.map(date => date.getFullYear() + date.getMonth() + date.getDate());

  let date = this.dateStart;

  while(true) {

    if (!datesSkipStrings.includes(date.getFullYear() + date.getMonth() + date.getDate())) {
      dates.push(new Date(date));
    }

    // get next weekday
    while(true) {
      date.setDate(date.getDate() + 1);
      let weekDay = date.getDay();
      if (weekDay === 0) weekDay = 7;
      if (this.weekDays.includes(weekDay)) break;
    }

    // out of range? then break
    if (moment(date).format('YYYYMMDD') > moment(this.dateEnd).format('YYYYMMDD')) {
      break;
    }
  }

  return dates;
};

schema.methods.decreaseParticipantsLimit = function(count) {
  count = count === undefined ? 1 : count;
  this.participantsLimit -= count;
  if (this.participantsLimit < 0) this.participantsLimit = 0;
  if (this.participantsLimit === 0) {
    this.isOpenForSignup = false; // we're full!
  }
};

module.exports = mongoose.model('CourseGroup', schema);

