"use strict";

var fs = require('fs');
var Docxtemplater = require('docxtemplater');
var path = require('path');
const moment = require('moment');
const CourseGroup = require('../models/courseGroup');
const CourseParticipant = require('../models/courseParticipant');
const CourseInvite = require('../models/courseInvite');
const priceInWords = require('textUtil/priceInWords');
const config = require('config');
const CacheEntry = require('cache').CacheEntry;
const crypto = require('crypto');
const log = require('log')();
const sign = require('payments').sign;

const invoiceConfig = config.payments.modules.invoice;

// Load the docx file as a binary
// @see https://github.com/open-xml-templating/docxtemplater
let docPath = path.join(__dirname, "doc/receipt.docx");

let docContent = fs.readFileSync(docPath);
let docMtime = fs.statSync(docPath).mtime.getTime();


module.exports = function* getReceipt(transaction, signed) {

  let group = yield CourseGroup.findOne(transaction.order.data.group);

  let invites = yield CourseInvite.find({
    order: transaction.order._id
  });

  let participants = yield CourseParticipant.find({
    invite: {
      $in: invites.map(invite => invite._id)
    }
  });

  let participantsString = participants.length ? participants.map(p => p.fullName).join(', ') : 'не указаны';

  const options = {
    TRANSACTION_NUMBER:   String(transaction.number),
    TRANSACTION_AMOUNT:   String(transaction.amount),
    TRANSACTION_CURRENCY: String(transaction.currency),
    GROUP:                group.title,
    PARTICIPANTS:         participantsString,
    COMPANY_NAME:         invoiceConfig.COMPANY_NAME,
    COMPANY_ADDRESS:      invoiceConfig.COMPANY_ADDRESS,
    OGRNIP:               invoiceConfig.OGRNIP,
    INN:                  invoiceConfig.INN,
    ACCOUNT:              invoiceConfig.ACCOUNT,
    BANK:                 invoiceConfig.BANK,
    CORR_ACC:             invoiceConfig.CORR_ACC,
    BIK:                  invoiceConfig.BIK,
    PHONE:                invoiceConfig.PHONE,
    EMAIL:                invoiceConfig.EMAIL,
    TRANSACTION_DATE:     moment(transaction.created).format('DD.MM.YYYY'),
    SIGN_TITLE:           invoiceConfig.SIGN_TITLE,
    SIGN_NAME:            invoiceConfig.SIGN_NAME,
    SIGN_SHORT_NAME:      invoiceConfig.SIGN_SHORT_NAME
  };

  let cacheKey = crypto.createHash('md5')
    .update(JSON.stringify(options))
    .update(String(docMtime))
    .update(String(signed))
    .digest('hex');


  // console.log(options);

  return yield* CacheEntry.getOrGenerate({
    key:  'getReceipt:' + cacheKey,
    tags: ['doc']
  }, doRender);


  function *doRender() {
    let doc = new Docxtemplater(docContent);
    doc.setData(options);
    doc.render();
    doc = doc.getZip().generate({type: "nodebuffer"});

    if (!signed) {
      return {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        body: doc
      };
    }

    let signedDoc = yield* sign(doc);

    return {
      type: 'application/pdf',
      body: signedDoc
    };

  }

};
