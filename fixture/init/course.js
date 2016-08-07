const mongoose = require('mongoose');

var Course = require('courses').Course;
var CourseGroup = require('courses').CourseGroup;
var CourseInvite = require('courses').CourseInvite;
var oid = require('oid');

exports.Course = [
  {
    "_id":            oid('course-js'),
    slug:             "js",
    videoKeyTag:      "js",
    title:            "Курс JavaScript/DOM/интерфейсы",
    titleShort:       "JavaScript/DOM/интерфейсы",
    shortDescription: `
    <p>"Правильный" курс по профессиональному JavaScript, цель которого – научить думать на JavaScript, писать просто, быстро и красиво.</p>
    <p>Стоимость обучения <span class="auto-currency" data-currency="RUB">21000 руб</span>, время обучения: 2 месяца.</p>`,
    isListed:         true,
    weight:           1,
    price:            21000
  },
  {
    "_id":            oid('course-nodejs'),
    slug:             "nodejs",
    videoKeyTag:      "js",
    title:            "Курс по Node.JS",
    titleShort:       "Node.JS",
    shortDescription: `
    <p>Профессиональная разработка на платформе Node.JS (серверный JavaScript), с использованием современных фреймворков и технологий.</p>
    <p>Стоимость обучения 13500 руб, время обучения: 1 месяц.</p>`,
    isListed:         true,
    weight:           2,
    price:            13500
  }
];

exports.CourseInvite = [];
exports.CourseParticipant = [];
exports.CourseFeedback = [];

exports.CourseGroup = [
  {
    course:            oid('course-js'),
    dateStart:         new Date(2016, 0, 1),
    dateEnd:           new Date(2016, 10, 10),
    timeStart:         '19:30',
    timeEnd:           '21:00',
    timeDesc:          "пн/чт 19:30 - 21:00 GMT+3",
    slug:              'js-1',
    price:             1,
    participantsLimit: 30,
    webinarId:         '123',
    isListed:          true,
    isOpenForSignup:   false,
    title:             "Курс JavaScript/DOM/интерфейсы (01.01)",
    teacher:           [oid('user-iliakan')]
  },
  {
    course:            oid('course-nodejs'),
    dateStart:         new Date(2016, 6, 22),
    dateEnd:           new Date(2016, 7, 10),
    timeStart:         '19:30',
    timeEnd:           '21:00',
    timeDesc:          "пн/ср/сб 19:30 - 21:00 GMT+3",
    slug:              'nodejs-20160722',
    price:             1,
    webinarId:         '456',
    participantsLimit: 30,
    isListed:          true,
    isOpenForSignup:   true,
    title:             "Курс по Node.JS (22.07)",
    teacher:           [oid('user-iliakan')]
  },
  {
    course:            oid('course-nodejs'),
    dateStart:         new Date(2016, 6, 1),
    dateEnd:           new Date(2016, 11, 10),
    timeDesc:          "пн/чт 21:30 - 23:00 GMT+3",
    timeStart:         '21:30',
    timeEnd:           '23:00',
    slug:              "nodejs-01",
    price:             1,
    webinarId:         '789',
    participantsLimit: 30,
    isListed:          true,
    isOpenForSignup:   false,
    title:             "Курс по Node.JS",
    teacher:           [oid('user-iliakan')]
  },
  {
    course:            oid('course-nodejs'),
    dateStart:         new Date(2016, 8, 1),
    dateEnd:           new Date(2016, 11, 29),
    timeDesc:          "пн/чт 21:30 - 23:00 GMT+3",
    timeStart:         '21:30',
    timeEnd:           '23:00',
    slug:              "nodejs-20160901",
    price:             1,
    webinarId:         '789',
    participantsLimit: 30,
    isListed:          true,
    isOpenForSignup:   false,
    title:             "Курс по Node.JS",
    teacher:           [oid('user-szelenov')]
  }
];
