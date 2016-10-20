'use strict';

const payments = require('payments');
const getOrderInfo = payments.getOrderInfo;
const Course = require('../models/course');
const CourseGroup = require('../models/courseGroup');
const CourseParticipant = require('../models/courseParticipant');
const CourseInvite = require('../models/courseInvite');
const Discount = require('payments').Discount;
const config = require('config');
const moment = require('momentWithLocale');
const money = require('money');
const pluralize = require('textUtil/pluralize');
const getDiscounts = require('../lib/getDiscounts');

exports.get = function*() {
  this.nocache();

  this.locals.sitetoolbar = true;

  let group;

  if (!this.isAuthenticated()) {
    this.authAndRedirect(this.originalUrl);
    return;
  }

  let discounts;


  if (this.params.orderNumber) {
    yield* this.loadOrder({
      ensureSuccessTimeout: 10000
    });

    this.locals.order = this.order;
    this.locals.title = 'Заказ №' + this.order.number;

    this.locals.changePaymentRequested = Boolean(this.query.changePayment);

    group = this.locals.group = yield CourseGroup.findById(this.order.data.group).populate('course').exec();

    if (!group) {
      this.throw(404, "Нет такой группы.");
    }

    discounts = yield* getDiscounts({
      user: this.user,
      group: group,
      discountCode: this.query.code
    });

    if (this.order.status == payments.Order.STATUS_SUCCESS) {
      let invite = yield CourseInvite.findOne({email: this.user.email, accepted: false}).exec();
      if (invite) this.locals.hasInvite = true;

      if (this.order.data.count > 1 || this.order.data.emails[0] != this.user.email) {
        this.locals.hasOtherParticipants = true;
      }
    }

  } else {

    group = this.locals.group = this.groupBySlug;

    discounts = yield* getDiscounts({
      user: this.user,
      group: group,
      discountCode: this.query.code
    });

    // a visitor can't reach this page through UI, only by direct link
    // if the group is full
    if (!group.isOpenForSignup && !discounts.find(d => d.code == this.query.code && d.data && d.data.limitOverride)) {
      this.statusCode = 403;
      this.body = this.render('/notification', {
        title:   'Запись в эту группу завершена',
        message: {
          type: 'error',
          html: `
          Запись в эту группу завершена.
          Перейдите на <a href="/courses/${group.course.slug}">страницу курса</a>, чтобы увидеть открытые группы.
          `
        }
      });
      return;
    }

    this.locals.title = "Регистрация\n" + group.title;
  }

  this.locals.allPaymentMethods = payments.methods;
  this.locals.paymentMethods = require('../lib/paymentMethods');

  // if he was participant of the same group in the past half-year once, can claim free
  // =====================
  let pastGroups = yield CourseGroup.find({
    course: group.course._id,
    dateEnd: {
      // last 6 months
      $gt: new Date(+new Date() - 6*31*86400*1e3)
    }
  }, {_id: 1});
  let pastGroupsIds = pastGroups.map(group => group._id);

  let pastParticipant = yield CourseParticipant.find({
    group:{
      $in: pastGroupsIds
    },
    user: this.user._id,
    isActive: true
  });

  // user is able to make an order for many people
  // control manually is he correct or not
  // approve manually.
  if (pastParticipant.length == 1) {
    // copy, so that we won't alter paymentMethods module globally
    this.locals.paymentMethods = Object.assign({}, this.locals.paymentMethods, {free: payments.methods.free.info});
  }

  // .. same group participant
  // ================

  this.locals.breadcrumbs = [
    {title: 'Учебник', url: '/'},
    {title: 'Курсы', url: '/courses'}
  ];

  if (this.order) {
    this.locals.orderInfo = yield* getOrderInfo(this.order);
    this.locals.receiptTitle = `Участие в курсе для ${this.order.data.count}
      ${pluralize(this.order.data.count, 'человека', 'человек', 'человек')}`;

    this.locals.receiptAmount = this.order.amount;
    this.locals.receiptContactPhone = this.order.data.contactPhone;
    this.locals.receiptContactName = this.order.data.contactName;

  } else {
    this.locals.orderInfo = {};
  }

  this.locals.mailto = "mailto:orders@javascript.ru";
  if (this.order) {
    this.locals.mailto += '?subject=' + encodeURIComponent('Заказ ' + this.order.number);
  }


  this.locals.formatGroupDate = function(date) {
    return moment(date).format('D MMM YYYY').replace(/[а-я]/, function(letter) {
      return letter.toUpperCase();
    });
  };

  let participantsMax = group.participantsLimit;

  let price = Discount.adjustAmountAll(group.price, discounts);

  // allow to register more than possible for code discounts
  if (discounts.find(d => d.code = this.query.code && d.data.limitOverride)) {
    participantsMax = 10;
  }

  this.locals.groupInfo = {
    price:           price,
    fullPrice:       (group.price == price) ? null : group.price,
    participantsMax: participantsMax,
    slug:            group.slug
  };

  this.body = this.render('signup');
};
