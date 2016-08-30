const fs = require('mz/fs');
const Docxtemplater = require('docxtemplater');
const path = require('path');
const invoiceConfig = require('config').payments.modules.invoice;
const moment = require('momentWithLocale');
const priceInWords = require('textUtil/priceInWords');
const CacheEntry = require('cache').CacheEntry;
const crypto = require('crypto');
const config = require('config');
const log = require('log')();
const sign = require('payments').sign;
const getGroupAmount = require('../../lib/getGroupAmount');

let docPath = path.join(__dirname, "../../doc/agreementTeacher.docx");
let docContent = fs.readFileSync(docPath);
let docMtime = fs.statSync(docPath).mtime.getTime();

exports.get = function*() {
  this.nocache();

  if (!this.user) {
    this.throw(401);
  }

  let hasAccess;

  if (this.user.hasRole('admin')) {
    hasAccess = true;
  }

  if (this.groupBySlug.teacher._id.equals(this.user._id) && this.groupBySlug.teacherAgreement.enabled) {
    hasAccess = true;
  }

  if (!hasAccess) {
    this.throw(403);
  }

  let group = this.groupBySlug;

  let amount = yield* getGroupAmount(group);

  let agreementAmount = this.query.amount || amount.teacher;

  if (!group.teacherAgreement) {
    group.teacherAgreement = Object.assign({}, group.teacher.teacherAgreement.toObject());
    yield group.persist();
  }

  const options = {
    AGREEMENT_TITLE:            'T-' + group.number + '-' + moment(group.dateStart).format('YYYYMMDD'),
    AGREEMENT_DATE:             moment(group.dateStart).format('DD.MM.YYYY'),
    OUR_HEAD:                   invoiceConfig.COMPANY_INVOICE_HEAD.replace('Исполнитель', 'Заказчик'),
    OUR_NAME:                   invoiceConfig.COMPANY_NAME,
    CONTRAGENT_HEAD:            group.teacherAgreement.contragentHead,
    CONTRAGENT_NAME:            group.teacherAgreement.contragentName,
    CONTRAGENT_SIGN_SHORT_NAME: group.teacherAgreement.contragentSignShortName,
    GROUP_DURATION_DATE:        "с " + moment(group.dateStart).format('DD.MM.YYYY') + ' по ' + moment(group.dateEnd).format('DD.MM.YYYY') + ", " + group.timeDesc + '.',
    COURSE_URL:                 'https://' + config.domain.main + group.course.getUrl(),
    AMOUNT:                     agreementAmount,
    AMOUNT_WORDS:               priceInWords(agreementAmount),
    AGREEMENT_FINAL_DATE:       moment(group.dateEnd).add(60, 'days').format('DD.MM.YYYY'),
    COMPANY_ADDRESS:            invoiceConfig.COMPANY_ADDRESS,
    INN:                        invoiceConfig.INN,
    OGRNIP:                     invoiceConfig.OGRNIP,
    ACCOUNT:                    invoiceConfig.ACCOUNT,
    BANK:                       invoiceConfig.BANK,
    CORR_ACC:                   invoiceConfig.CORR_ACC,
    BIK:                        invoiceConfig.BIK,
    PHONE:                      invoiceConfig.PHONE,
    EMAIL:                      invoiceConfig.EMAIL,
    SIGN_SHORT_NAME:            invoiceConfig.SIGN_SHORT_NAME,
    ACT_DATE:                   moment(group.dateEnd).format('DD.MM.YYYY'),
    CONTRAGENT_ADDRESS:         group.teacherAgreement.contragentAddress,
    CONTRAGENT_INN:             group.teacherAgreement.contragentInn,
    HAS_CONTRAGENT_INN:         Boolean(group.teacherAgreement.contragentInn),
    CONTRAGENT_PHONE:           group.teacherAgreement.contragentPhone,
    CONTRAGENT_EMAIL:           group.teacher.teacherEmail,
    CONTRAGENT_BANK:            group.teacherAgreement.contragentBank
  };

  let signed = this.params.ext == 'pdf';

  let cacheKey = crypto.createHash('md5')
    .update(JSON.stringify(options))
    .update(String(docMtime))
    .update(String(signed))
    .digest('hex');


  let doc = yield* CacheEntry.getOrGenerate({
    key:  'teacherAgreement:' + cacheKey,
    tags: ['doc']
  }, doRender);


  Object.assign(this, doc);

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

};
