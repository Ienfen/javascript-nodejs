'use strict';

const Order = require('payments').Order;
const sendMail = require('mailer').send;
const ExpiringDownloadLink = require('downloadByLink').ExpiringDownloadLink;
const path = require('path');
const log = require('log')();

// not a middleware
// can be called from CRON
module.exports = function* (order) {

  var downloadLink = new ExpiringDownloadLink({
    expires: new Date(Date.now() + 86400 * 90 * 1e3), // expires in 90days
    relativePath: order.data.file,
    linkId: "/" + path.basename(order.data.file)
  });

  yield downloadLink.persist();

  yield* sendMail({
    templatePath: path.join(__dirname, '..', 'templates', 'successEmail'),
    to: order.email,
    subject: "Учебник для чтения оффлайн",
    link: downloadLink.getUrl()
  });

  order.data.downloadLink = downloadLink.getUrl();
  order.markModified('data');
  order.status = Order.STATUS_SUCCESS;

  yield order.persist();

  log.debug("Order success: " + order.number);
};
