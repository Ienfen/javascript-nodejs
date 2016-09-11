'use strict';

const co = require('co');
const gutil = require('gulp-util');
const mws = require('../lib/mws');
const yakassaConfig = require('config').payments.modules.yakassa;
const currencyRate = require('currencyRate');
var Transaction = require('../../models/transaction');
var Order = require('../../models/order');
const cheerio = require('cheerio');
const currencies = require('country-data').currencies;
/**
 * Mark TX as paid
 * @returns {Function}
 */
module.exports = function() {

  var args = require('yargs')
    .example('gulp payments:yakassa:returnPayment --transaction 12345678 [--amount 1234 --invoiceId 200232]')
    .argv;

  return function() {

    return co(function*() {
      yield* currencyRate.boot();

      var transaction;

      if (args.transaction) {
        transaction = yield Transaction.findOne({number: args.transaction}).populate('order');
      } else if (args.order) {
        let order = yield Order.findOne({number: args.order});
        if (!order) {
          throw new Error("No order with number " + args.order);
        }
        transaction = yield Transaction.findOne({
          order: order._id,
          status: Transaction.STATUS_SUCCESS,
          paymentMethod : "yakassa"
        }).populate('order');
      } else {
        throw new Error("No transaction / order argument");
      }

      if (!transaction) {
        throw new Error("No such transaction");
      }

      gutil.log("Order number:" + transaction.order.number);

      if (transaction.status != Transaction.STATUS_SUCCESS && !args.force) {
        throw new Error("TX is not successful");
      }

      if (transaction.paymentMethod != 'yakassa') {
        throw new Error("TX paymentMethod isn't yakassa");
      }


      yield transaction.log('payments:transaction:yakassa:returnPayment');


      let date = new Date();
      // types: https://money.yandex.ru/doc.xml?id=527070
      let params = {
        clientOrderId: +date,
        requestDT:     date.toJSON(),
        invoiceId:     args.invoiceId || transaction.paymentDetails.aviso.invoiceId,
        shopId:        yakassaConfig.shopId,
        amount:        (+(args.amount || transaction.amount)).toFixed(2),
        currency:      currencies[transaction.currency].number, // ISO code
        cause:         'возврат оплаты'
      };

      let result;

      try {
        result = yield* mws.sendPkcs7Request('returnPayment', params);
      } catch (e) {
        yield transaction.log('payments:transaction:yakassa:returnPayment error', e);
        throw e;
      }

      yield transaction.log('payments:transaction:yakassa:returnPayment response', result);

      let dom = cheerio.load(result, {
        xmlMode: true
      });

      let returnPaymentResponse = dom.root().children()[0];

      let status = +returnPaymentResponse.attribs.status;
      let error = +returnPaymentResponse.attribs.error;

      if (status === 0 && error === 0) {
        yield transaction.log('payments:transaction:yakassa:returnPayment success');
      } else {
        throw new Error("response failure: " + result);
      }

      yield transaction.persist({
        status: Transaction.STATUS_REFUND
      });

    });

  };
};

