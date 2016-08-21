const fs = require('mz/fs');
const Docxtemplater = require('docxtemplater');
const path = require('path');
const Transaction = require('../../models/transaction');
const invoiceConfig = require('config').payments.modules.invoice;
const moment = require('moment');
const priceInWords = require('textUtil/priceInWords');
const CacheEntry = require('cache').CacheEntry;
const crypto = require('crypto');
const config = require('config');
const exec = require('mz/child_process').exec;
const log = require('log')();
const sign = require('../../lib/sign');

// invoice form is same for all modules
let docPath = path.join(__dirname, "../doc/invoice.docx");
let docContent = fs.readFileSync(docPath);
let docMtime = fs.statSync(docPath).mtime.getTime();


exports.get = function*() {
  yield this.loadTransaction();

  if (!this.transaction) {
    this.log.debug("No transaction");
    this.throw(404);
  }

  if ((this.transaction.status != Transaction.STATUS_PENDING && this.transaction.status != Transaction.STATUS_SUCCESS) || this.transaction.paymentMethod != 'invoice') {
    this.log.debug("Improper transaction", this.transaction.toObject());
    this.throw(400);
  }

  const invoiceDoc = yield* getInvoice(this.transaction, this.params.ext == 'pdf');

  Object.assign(this, invoiceDoc);

};

function* getInvoice(transaction, signed) {

  const options = {
    COMPANY_NAME:        invoiceConfig.COMPANY_NAME,
    COMPANY_ADDRESS:     invoiceConfig.COMPANY_ADDRESS,
    INN:                 invoiceConfig.INN,
    ACCOUNT:             invoiceConfig.ACCOUNT,
    BANK:                invoiceConfig.BANK,
    CORR_ACC:            invoiceConfig.CORR_ACC,
    BIK:                 invoiceConfig.BIK,
    TRANSACTION_NUMBER:  String(transaction.number),
    TRANSACTION_DATE:    moment(transaction.created).format('DD.MM.YYYY'),
    BUYER_COMPANY_NAME:  transaction.paymentDetails.companyName,
    PAYMENT_DESCRIPTION: `Оплата за информационно-консультационные услуги по счёту ${transaction.number}`,
    AMOUNT:              transaction.amount + 'р.',
    AMOUNT_IN_WORDS:     priceInWords(transaction.amount),
    SIGN_TITLE:          invoiceConfig.SIGN_TITLE,
    SIGN_NAME:           invoiceConfig.SIGN_NAME,
    SIGN_SHORT_NAME:     invoiceConfig.SIGN_SHORT_NAME
  };

  let cacheKey = crypto.createHash('md5')
    .update(JSON.stringify(options))
    .update(String(docMtime))
    .update(String(sign))
    .digest('hex');


  return yield* CacheEntry.getOrGenerate({
    key:  'getInvoice:' + cacheKey,
    tags: ['doc']
  }, doRender);


  function *doRender() {
    let invoiceDoc = new Docxtemplater(docContent);
    invoiceDoc.setData(options);
    invoiceDoc.render();
    invoiceDoc = invoiceDoc.getZip().generate({type: "nodebuffer"});

    if (!signed) {
      return {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        body: invoiceDoc
      };
    }

    let signedDoc = yield* sign(invoiceDoc);

    return {
      type: 'application/pdf',
      body: signedDoc
    };

  }

}
