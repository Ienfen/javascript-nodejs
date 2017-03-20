var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  apiKey: {
    type: String,
    unique: true,
    trim: true,
    required: true
  },

  title: {
    type: String,
    required: true
  },

  tag: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('VideoKeyProject', schema);

