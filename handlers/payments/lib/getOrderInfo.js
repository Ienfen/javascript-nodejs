'use strict';

const Order = require('../models/order');
const Transaction = require('../models/transaction');
const log = require('log')();
const escapeHtml = require('escape-html');

/**
 * high-level order status & transaction which caused it & messages to show
 * success -- order success: paid, processed
 * paid -- order paid, but not yet success
 * error -- server-side error
 * fail -- payment failed
 * pending -- waiting for payment
 * cancel -- order canceled
 * @param order
 * @returns {*}
 */
module.exports = function*(order) {
  var info = yield* getOrderInfo(order);

  var linkToProfile = '';
  if (order.user && require(order.module).formatOrderForProfile) {
    linkToProfile = `<p>Информацию о заказе вы также можете найти <a href="${order.user.getProfileUrl()}/orders">в своём профиле</a>.</p>`;
  }

  info.linkToProfile = linkToProfile;

  return info;
};

function* getOrderInfo(order) {
  // get transaction which defines current status

  var mailUrl = '<a href="mailto:orders@javascript.ru?subject=' + encodeURIComponent('Заказ ' + order.number) + '">orders@javascript.ru</a>';
  var transaction;

  if (order.status == Order.STATUS_SUCCESS) {
    // may not be the last transaction by modified
    // because theoretically it's possible to have 2 transactions:
    // pending (1tx) -> fail, pending (2nx tx came) -> success, pending (1st tx got money)
    transaction = yield Transaction.findOne({
      order:  order._id,
      status: Transaction.STATUS_SUCCESS
    });

    let descriptionProfile = '';
    if (transaction && transaction.paymentMethod == 'invoice' && transaction.paymentDetails.agreementRequired) {
      descriptionProfile += `<div>Вы можете повторно скачать <a href="/payments/invoice/invoice-${transaction.number}.docx">счёт</a>
        и <a href="/payments/invoice/agreement-${transaction.number}.docx">договор с актом</a>.</div>`;
    }

    if (transaction && transaction.paymentDetails.hasDocuments) {
      descriptionProfile += `<p>Для вас есть <b><a href="/payments/invoice/documents-${transaction.number}.zip">документы от администратора</a></b>.</p>`;
    }


    // console.log(transaction && transaction.toObject(), descriptionProfile, '!!!!!');
    // it is possible that there is no transaction at all
    // (if order status is set manually)
    return {
      number:             order.number,
      status:             "success",
      statusText:         "Оплата получена",
      transaction,
      descriptionProfile
      // no title/accent/description, because the action on success is order-module-dependant
    };
  }

  if (order.status == Order.STATUS_PAID) {
    transaction = yield Transaction.findOne({
      order:  order._id,
      status: Transaction.STATUS_SUCCESS
    }).exec();

    return {
      number:      order.number,
      status:      "paid",
      statusText:  "Ожидает обработки",
      transaction: transaction,
      title:       "Спасибо за заказ!",
      accent:      "Оплата получена, заказ обрабатывается.",
      description: `<p>По окончании вам будет отправлено письмо на электронный адрес <b>${order.email}</b>.</p>
        <p>Если у вас возникли какие-нибудь вопросы, присылайте их на ${mailUrl}.</p>`
    };

  }

  if (order.status == Order.STATUS_PENDING) {

    // let's check if
    // PENDING order, but Transaction.STATUS_SUCCESS?
    // (impossible)
    transaction = yield Transaction.findOne({
      order:  order._id,
      status: Transaction.STATUS_SUCCESS
    }).exec();

    if (transaction) {
      log.error("Transaction success, but order pending?!? Impossible! Must be paid", transaction, order);
      return {
        // our error, the visitor can do nothing
        status:      "error",
        statusText:  "Произошла ошибка",
        transaction: transaction,
        title:       "Произошла ошибка.",
        accent:      "При обработке платежа произошла ошибка.",
        description: `<p>Пожалуйста, напишите в поддержку ${mailUrl}.</p>`,
        number:      order.number
      };
    }

    // NO CALLBACK from online-system yet
    // probably he just pressed the "back" button
    // OR
    // selected the offline method of payment
    // OR
    // callback will come later
    transaction = yield Transaction.findOne({
      order:  order._id,
      status: Transaction.STATUS_PENDING // there may be only 1 pending tx at time
    }).exec();

    log.debug("findOne pending transaction: ", transaction && transaction.toObject());

    if (transaction) {

      // Waiting for payment

      let afterInfo = order.module == 'donate' ? '' : `<p>После оплаты в течение двух рабочих дней мы вышлем вам всю необходимую информацию на адрес <b>${order.email}</b>.</p>`;

      let thanks = order.module == 'donate' ? "Спасибо!" : "Спасибо за заказ!"

      if (transaction.paymentMethod == 'banksimple') {
        return {
          number:             order.number,
          status:             "pending",
          statusText:         "Ожидается оплата",
          transaction:        transaction,
          title:              thanks,
          accent:             `Для завершения скачайте квитанцию и оплатите ее через банк.`,
          description:        `
          <div><button class="submit-button" onclick="location.href='/payments/banksimple/invoice-${transaction.number}.docx'" type="button"><span class="submit-button__text">Скачать квитанцию</span></button></div>
            <p>Квитанция действительна три дня. Оплатить можно в Сбербанке РФ (3% комиссия) или любом банке, где у вас есть счёт.</p>
            ${afterInfo}
            <p>Если у вас возникли какие-либо вопросы, присылайте их на ${mailUrl}.</p>
            `,
          descriptionProfile: `<div>Вы можете повторно <a href="/payments/banksimple/invoice-${transaction.number}.docx">скачать квитанцию</a>. Изменить метод оплаты можно нажатием на кнопку ниже.</div>`
        };
      } else if (transaction.paymentMethod == 'banksimpleua') {
        return {
          number:             order.number,
          status:             "pending",
          statusText:         "Ожидается оплата",
          transaction:        transaction,
          title:              thanks,
          accent:             `Для завершения скачайте счёт и оплатите его через банк.`,
          description:        `<div><button class="submit-button" onclick="location.href='/payments/banksimpleua/invoice-${transaction.number}.docx'" type="button"><span class="submit-button__text">Скачать квитанцию</span></button></div>
            <p>Квитанция – в гривнах, действительна три дня.</p>
            ${afterInfo}
            <p>Если у вас возникли какие-либо вопросы, присылайте их на ${mailUrl}.</p>
            `,
          descriptionProfile: `<div>Вы можете повторно <a href="/payments/banksimpleua/invoice-${transaction.number}.docx">скачать квитанцию</a>. Изменить метод оплаты можно нажатием на кнопку ниже.</div>`
        };
      } else if (transaction.paymentMethod == 'invoice') {
        var invoiceButton = `<button class="submit-button" onclick="location.href='/payments/invoice/invoice-${transaction.number}.docx'" type="button"><span class="submit-button__text">Скачать счёт в Doc</span></button>`;
        var agreementButton = transaction.paymentDetails.agreementRequired ?
          `<button class="submit-button" onclick="location.href='/payments/invoice/agreement-${transaction.number}.docx'" type="button"><span class="submit-button__text">Скачать договор и акт в Doc</span></button>` :
          '';
        var invoiceSignedButton = `<button class="submit-button" onclick="location.href='/payments/invoice/invoice-${transaction.number}.pdf'" type="button"><span class="submit-button__text">Скачать счёт с пописью</span></button>`;
        var agreementSignedButton = transaction.paymentDetails.agreementRequired ?
          `<button class="submit-button" onclick="location.href='/payments/invoice/agreement-${transaction.number}.pdf'" type="button"><span class="submit-button__text">Скачать договор и акт с подписью</span></button>` :
          '';

        var documents = '';
        if (transaction.paymentDetails && transaction.paymentDetails.hasDocuments) {
          documents = `<p>Для вас есть <b><a href="/payments/invoice/documents-${transaction.number}.zip">документы от администратора</a></b>.</p>`;
        }

        return {
          number:             order.number,
          status:             "pending",
          statusText:         "Ожидается оплата",
          transaction:        transaction,
          title:              thanks,
          accent:             `Для завершения произведите оплату по счёту.`,
          description:        `
            <div>${invoiceSignedButton} ${agreementSignedButton}</div>
            <div>${invoiceButton} ${agreementButton}</div>
            <p>Счёт действителен пять рабочих дней.</p>
            <p>После оплаты мы вышлем вам всю необходимую информацию на адрес <b>${order.email}</b>.</p>
            <p>Если у вас возникли какие-либо вопросы, присылайте их на ${mailUrl}.</p>
            `,
          descriptionProfile: `<div>Вы можете повторно скачать <a href="/payments/invoice/invoice-${transaction.number}.docx">счёт в Word-формате</a> и как <a href="/payments/invoice/invoice-${transaction.number}.pdf">PDF с подписью</a>` +
                              (transaction.paymentDetails.agreementRequired ?
                                  `, а также <a href="/payments/invoice/agreement-${transaction.number}.docx">договор с актом в Word-формате</a> и как <a href="/payments/invoice/agreement-${transaction.number}.pdf">PDF с подписью</a>` : '') +
                                  `. Изменить детали и метод оплаты можно нажатием на кнопку ниже.</div>${documents}`
        };
      } else {
        return {
          number:      order.number,
          status:      "pending",
          statusText:  "Ожидается оплата",
          transaction: transaction,
          title:       thanks,
          accent:      transaction.paymentMethod == 'free' ?
            `Сообщите номер заказа ${order.number} преподавателю для зачисления.` :
             `Как только мы получим подтверждение от платёжной системы, мы пришлём вам письмо на адрес <b>${order.email}</b>.`,
          description: transaction.paymentMethod == 'free' ? '' : `
          <p>Если у вас возникли проблемы при работе с платежной системой, и оплатить не удалось,
          вы можете <a href="?changePayment=1" data-order-payment-change>выбрать другой метод оплаты</a> и оплатить заново.</p>
          <p>Если у вас возникли какие-либо вопросы, присылайте их на ${mailUrl}.</p>`
        };
      }
    }

    // Failed?
    // Show the latest error and let him pay
    transaction = yield Transaction.findOne({
      order:  order._id,
      status: Transaction.STATUS_FAIL
    }).sort({created: -1}).exec();

    log.debug("findOne failed transaction: ", transaction && transaction.toObject());

    return {
      number:      order.number,
      status:      "fail",
      statusText:  "Оплата не прошла",
      title:       "Оплата не прошла.",
      transaction: transaction,
      accent:      "Оплата не прошла, попробуйте ещё раз.",
      description: (transaction.statusMessage ? `<div><em>${escapeHtml(transaction.statusMessage)}</em></div>` : '') +
                   `<p>По вопросам, касающимся оплаты, пишите на ${mailUrl}.</p>`
    };


  }


  if (order.status == Order.STATUS_CANCEL) {
    return {
      number:      order.number,
      status:      "cancel",
      statusText:  "Заказ отменён",
      title:       "Заказ отменён.",
      description: `<p>По вопросам, касающимся заказа, пишите на ${mailUrl}.</p>.`
    };
  }

  log.error("order", order);
  throw new Error("Must never reach this point. No transaction?");

}
