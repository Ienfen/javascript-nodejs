var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var autoIncrement = require('mongoose-auto-increment');
var OrderTemplate = require('./orderTemplate');
var Transaction = require('./transaction');
var _ = require('lodash');

var schema = new Schema({
  discount:      {
    type:     Number,
    required: true
  },



  module: {
    type: String,
    required: true
  },


  description: {
    type: String
  },

  // data for the module
  data: {},

  code: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return Math.random().toString(36).slice(2, 10);
    }
  },

  isActive: {
    type:    Boolean,
    default: true
  },

  created:  {
    type:    Date,
    default: Date.now
  }

});

/**
 * find active discount with the code
 * if discount has onlyModule set, ensure the match
 */
schema.statics.findByCodeAndModule = function*(code, module) {
  return yield Discount.findOne({code: code, isActive: true, module: module}).exec();
};

schema.methods.format = function() {
  if (this.discount <= 1) {
    return Math.round((1-this.discount) * 100) + '%';
  }

  return -this.discount;
};

schema.methods.adjustAmount = function(amount) {
  return this.discount == 1 ? amount :
    this.discount < 1 ? amount * this.discount :
      this.discount;
};

// apply all discounts to amount, return the minimal cost
schema.statics.adjustAmountAll = function(amount, discounts) {
  if (!discounts.length) return amount;

  let amounts = discounts.map(discount => discount.adjustAmount(amount));
  return Math.min(...amounts);
};

// get discount object with best discount for the amount
schema.statics.getBest = function(amount, discounts) {
  if (!discounts.length) return null;

  let discountBest = null;
  let amountBest = amount;

  for (let i = 0; i < discounts.length; i++) {
    let discount = discounts[i];
    let newAmount = discount.adjustAmount(amount);
    if (newAmount < amountBest) {
      discountBest = discount;
      amountBest = newAmount;
    }
  }

  return discountBest;
};


var Discount = module.exports = mongoose.model('Discount', schema);

