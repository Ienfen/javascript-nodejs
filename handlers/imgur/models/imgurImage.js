const capitalizeKeys = require('lib/capitalizeKeys');
const BadImageError = require('../lib/badImageError');
const mongoose = require('lib/mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  imgurId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String
  },
  description: {
    type: String
  },
  datetime: {
    type: Number
  },
  type: {
    type: String
  },
  animated: {
    type: Boolean
  },
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  views: {
    type: Number,
    required: true
  },
  bandwidth: {
    type: Number,
    required: true
  },
  deletehash: {
    type: String,
    required: true
  },
  name: {
    type: String
  },
  link: {
    type: String
  },
  gifv: {
    type: String
  },
  mp4: {
    type: String
  },
  webm: {
    type: String
  },
  section: {
    type: String
  },
  looping: {
    type: Boolean
  },
  favorite: {
    type: Boolean
  },
  nsfw: {
    type: Boolean
  },
  vote: {
    type: String
  },
  accountId: {
    type: Number
  },
  accountUrl: {
    type: String
  }
});

/**
 * Create ImgurImage from raw imgur response and save it.
 * @param response
 * @returns {*}
 */
schema.statics.createFromResponse = function*(response) {

  if (!response.success) {
    throw new BadImageError(response.data.error);
  }

  var imgurImageData = capitalizeKeys(response.data);
  imgurImageData.imgurId = imgurImageData.id;
  delete imgurImageData.id;

  var imgurImage = new ImgurImage(imgurImageData);
  yield imgurImage.persist();
  return imgurImage;
};

/* jshint -W003 */
var ImgurImage = module.exports = mongoose.model('imgurImage', schema);
