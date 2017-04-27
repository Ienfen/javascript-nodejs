const payments = require('payments');

var paymentMethods = {};

var methodsEnabled = ['yakassa', 'interkassa', 'webmoney', 'yandexmoney', 'payanyway', 'paypal'];

if (process.env.NODE_ENV != 'production') {
  methodsEnabled.push('fail', 'success');
}

methodsEnabled.forEach(function(key) {
  paymentMethods[key] = payments.methods[key].info;
});

module.exports = paymentMethods;
