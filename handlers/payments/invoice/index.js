const Transaction = require('../models/transaction');
const path = require('path');
const money = require('money');
const sendMail = require('mailer').send;
const config = require('config');
exports.renderForm = require('./renderForm');

// TX gets this status when created
exports.createTransaction = function*(order, body) {


  var transaction = new Transaction({
    order:          order._id,
    currency:       'RUB',
    amount:         order.convertAmount('RUB'),
    status:         Transaction.STATUS_PENDING,
    paymentMethod:  path.basename(__dirname),
    paymentDetails: {
      companyName:       String(body.invoiceCompanyName),
      agreementRequired: Boolean(body.invoiceAgreementRequired),
      contractHead:      String(body.invoiceContractHead),
      companyAddress:    String(body.invoiceCompanyAddress),
      companyMailIndex:  String(body.invoiceCompanyMailIndex),
      companyMailWho:     String(body.invoiceCompanyMailWho),
      companyMailAddress:  String(body.invoiceCompanyMailAddress),
      companyMailSent:   false,
      bankDetails:       String(body.invoiceBankDetails)
    }
  });

  yield transaction.persist();

  yield sendMail({
    from:             'orders',
    templatePath:     path.join(__dirname, 'templates/notificationEmail'),
    site:             'https://' + config.domain.main,
    invoiceUrl:       `https://${config.domain.main}/payments/invoice/invoice-${transaction.number}.docx`,
    agreementUrl:     `https://${config.domain.main}/payments/invoice/agreement-${transaction.number}.docx`,
    invoiceSignedUrl:       `https://${config.domain.main}/payments/invoice/invoice-${transaction.number}.pdf`,
    agreementSignedUrl:     `https://${config.domain.main}/payments/invoice/agreement-${transaction.number}.pdf`,
    order:            order,
    transaction:      transaction,
    profileOrdersUrl: `https://${config.domain.main}${order.user.getProfileUrl()}/orders`,
    to:               order.email,
    subject:          "Выписан счёт на оплату"
  });

  return transaction;
};

exports.info = {
  title:    "Счёт на компанию",
  subtitle: '(для юрлиц из России)',
  name:     path.basename(__dirname),
  currency: 'RUB'
};
