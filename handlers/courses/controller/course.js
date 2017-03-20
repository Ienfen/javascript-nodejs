"use strict";

const moment = require('momentWithLocale');
const User = require('users').User;
const Course = require('../models/course');
const CourseGroup = require('../models/courseGroup');
const CourseTeacher = require('../models/courseTeacher');
const CourseFeedback = require('../models/courseFeedback');
const Discount = require('payments').Discount;
const renderFeedback = require('../lib/renderFeedback');
const countries = require('countries');
const getDiscounts = require('../lib/getDiscounts');

const money = require('money');

exports.get = function*() {

  let course = this.locals.course = yield Course.findOne({
    slug: this.params.course
  }).populate('featuredFeedbacks');

  if (!this.locals.course) {
    this.throw(404);
  }

  this.locals.title = course.title;

  this.locals.formatGroupDate = function(date) {
    return moment(date).format('D MMM YYYY').replace(/[а-я]/, function(letter) {
      return letter.toUpperCase();
    });
  };

  let discounts = yield* getDiscounts({
    user:   this.user,
    course: course
  });

  this.locals.teachers = yield CourseTeacher.find({
    course: course._id
  }).populate('teacher');

  this.locals.teachers = this.locals.teachers.map(t => t.teacher);

  let dateStart = new Date();
  dateStart.setDate(dateStart.getDate() - 1);
  let groups = yield CourseGroup.find({
    isListed:        true,
    isOpenForSignup: true,
    dateStart:       {
      $gt: dateStart // allow same-day signup
    },
    course:          course._id
  }).sort({
    dateStart: 1,
    created:   1
  }).populate('teacher');

  console.log(groups);

  this.locals.groups = groups.map(group => ({
    teacher:           group.teacher,
    price:             Discount.adjustAmountAll(group.price, discounts),
    fullPrice:         (Discount.adjustAmountAll(group.price, discounts) == group.price) ? null : group.price,
    discount:          Discount.getBest(group.price, discounts),
    dateStart:         group.dateStart,
    dateEnd:           group.dateEnd,
    timeDesc:          group.timeDesc,
    participantsLimit: group.participantsLimit,
    slug:              group.slug
  }));

  // first discount
  let firstDiscountedGroup = this.locals.groups.find(g => g.discount);
  let firstDiscount = firstDiscountedGroup && firstDiscountedGroup.discount;

  if (firstDiscount && firstDiscount.discount != 1) {
    this.locals.discountDescription = firstDiscount.description ?
      firstDiscount.description.replace(/EMAIL/g, this.user.email) : 'Скидка предоставлена по коду.';
  }

  for (let i = 0; i < course.featuredFeedbacks.length; i++) {
    let feedback = course.featuredFeedbacks[i];
    yield CourseFeedback.populate(feedback, 'participant');
  }


  let feedbacksRendered = [];

  for (var i = 0; i < course.featuredFeedbacks.length; i++) {
    var feedback = course.featuredFeedbacks[i];

    feedbacksRendered.push(yield* renderFeedback(feedback, {cut: true}));
  }

  this.locals.countries = countries.all;


  this.locals.feedbacks = feedbacksRendered;

  let feedbackStats = yield* CourseFeedback.getFeedbackStats(course);

  // this.locals.feedbacks = [{"course":{"link":"/courses/js","titleShort":"JavaScript/DOM/интерфейсы","title":"Курс JavaScript/DOM/интерфейсы"},"stars":5,"allReviewsHref":"/courses/js/feedbacks","content":"<p>Самый емкий курс из всех, что я проходил. Отличный стиль донесения материала.</p>\n","author":{"userId":"554ba3fc3f2ee62f61a54bf9","link":"/profile/dadubinin","name":"Денис Дубинин"},"photo":"http://i.imgur.com/Gg8bCZZ.jpg","country":"ua","city":"Kyiv"},{"course":{"link":"/courses/js","titleShort":"JavaScript/DOM/интерфейсы","title":"Курс JavaScript/DOM/интерфейсы"},"stars":5,"allReviewsHref":"/courses/js/feedbacks","isCut":true,"content":"<p>Прекрасное начало для желающих овладеть современным Javascript. Курс открывает все грани Javascript разработки от нативного кода до сопутствующих дисциплин: систем сборки, тестирования, JS-фреймворков. Причем, программа курса постоянно обновляется, предлагая студентам самые актуальные на момент обучения знания. Структура занятий позволяет легко усваивать теоретический материал и сразу же применять знания на практике, разбираясь с неизбежно…</p>\n","author":{"userId":"555066b1a7a9d03806fac74c","link":"/profile/alexei-zhuravski","name":"Алексей Журавский"},"photo":"http://i.imgur.com/GkNmrPb.jpg","country":"de","city":"Мюнхен"},{"course":{"link":"/courses/js","titleShort":"JavaScript/DOM/интерфейсы","title":"Курс JavaScript/DOM/интерфейсы"},"stars":5,"allReviewsHref":"/courses/js/feedbacks","isCut":true,"content":"<p>Благодарю Михаила и Илью за организацию достойного курса о языке Javascript.</p>\n<p>Курсом очень доволен. Уверен что потраченные усилия на курс в скором времени окупятся.</p>\n<p>На курсе Михаил Гринько четким и внятным голосом объяснил и показал работу с Javascript на профессиональном уровне, использовал новые технологии и сервисы, за что огромное спасибо! Ответил на все мои вопросы. И сделал записи…</p>\n","author":{"userId":"55bbfaf6bedbd73806df9577","link":"/profile/denis-efremov","name":"Денис Ефремов"},"photo":"http://i.imgur.com/g5vI4Tb.jpg","country":"ru","city":"Новосибирск"},{"course":{"link":"/courses/js","titleShort":"JavaScript/DOM/интерфейсы","title":"Курс JavaScript/DOM/интерфейсы"},"stars":5,"allReviewsHref":"/courses/js/feedbacks","isCut":true,"content":"<p>Михаил показал себя прекрасным преподавателем, который знает о чем он говорит (до мельчайших подробностей). На занятиях никогда не было скучно, занятия проходили динамично, с обсуждениями, ответами на вопросы и конечно же кодом.  От студентов нужно только желание учиться, а Михаил создаст благоприятные условия для этого :)\nКак итог: современные знания (на завершающих этапах писали приложение на es6); примеры кода, который применим в реальной работе…</p>\n","author":{"userId":"56753cffe26c021904c5a346","link":"/profile/andrey-gnilitskiy","name":"Андрей Гнилицкий"},"photo":"http://i.imgur.com/Av9VnDB.jpg","country":"ua","city":"Киев"},{"course":{"link":"/courses/js","titleShort":"JavaScript/DOM/интерфейсы","title":"Курс JavaScript/DOM/интерфейсы"},"stars":5,"allReviewsHref":"/courses/js/feedbacks","isCut":true,"content":"<p>Курс очень понравился! Михаил Гринько – отличный преподаватель. Мне кажется, ни один вопрос ни остался без ответа. Объяснения были доступными, Михаил стремился, чтоб поняли все, повторял по нескольку раз. Очень к месту были и его советы как работающего специалиста, о том на что стоит обратить внимание при написании кода.\nКонечно чтоб был толк от курса – требуется много работать самостоятельно: читать учебник, смотреть видео уроки…</p>\n","author":{"userId":"569b9a224a2fc72204ae7ffe","link":"/profile/igor-mitropan","name":"Игорь Митропан"},"photo":"http://i.imgur.com/CKoOeKC.jpg","country":"ua","city":"Харьков"}];
  this.locals.feedbackStats = {
    link: course.getUrl() + '/feedback',
    stats: feedbackStats // {"total":45,"recommendFraction":0.9777777777777777,"stars":{"1":{"fraction":0,"count":0},"2":{"fraction":0.02,"count":1},"3":{"fraction":0.02,"count":1},"4":{"fraction":0.16,"count":7},"5":{"fraction":0.8,"count":36}}}
  };

  this.body = this.render('courses/' + this.locals.course.slug);
};
