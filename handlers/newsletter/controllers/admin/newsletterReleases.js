'use strict';

const NewsletterTemplate = require('../../models/newsletterTemplate');
const NewsletterRelease = require('../../models/newsletterRelease');
const Newsletter = require('../../models/newsletter');
const MailList = require('../../models/mailList');
const mailer = require('mailer');
const Letter = require('mailer').Letter;
const CourseGroup = require('courses').CourseGroup;
const ObjectId = require('mongoose').Types.ObjectId;
const moment = require('momentWithLocale');
const formatLetter = require('../../lib/formatLetter');
const formatTestLetter = require('../../lib/formatTestLetter');
const findRecipients = require('../../lib/findRecipients');
const admin = require('admin');

require('mdeditor');

function* loadById(id) {
  if (!ObjectId.isValid(id)) {
    this.throw(400);
  }

  let newsletterRelease = yield NewsletterRelease.findById(id)
    .populate('user to.courseGroup to.newsletter to.mailList');

  if (!newsletterRelease) {
    this.throw(404);
  }
  if (!this.isAdmin && !newsletterRelease.user._id.equals(this.user._id)) {
    this.throw(403);
  }

  return newsletterRelease;
}

function *getFailedReasons(newsletterRelease) {
  let letters = yield Letter.find({
    labelId: newsletterRelease._id,
    $or:     [{
      sent: {
        $ne: true
      }
    }, {
      'lastSqsNotification.notificationType': {
        $ne: 'Delivery'
      }
    }]
  });

  let results = {};

  for (let i = 0; i < letters.length; i++) {
    let letter = letters[i];
    results[letter.message.to.address] = letter.getFailureDescription();
  }

  return results;

}

function* getToVariants() {
  let variants = [];
  if (this.isAdmin) {
    let newsletters = yield Newsletter.find().sort({weight: 1});
    for (let i = 0; i < newsletters.length; i++) {
      let newsletter = newsletters[i];
      variants.push({
        value: 'newsletter:' + newsletter.id,
        text:  newsletter.title
      });
    }
    let mailLists = yield MailList.find().sort({modified: -1});
    for (let i = 0; i < mailLists.length; i++) {
      let mailList = mailLists[i];
      variants.push({
        value: 'mailList:' + mailList.id,
        text:  mailList.title
      });
    }
  }

  let dateGreater = new Date();
  dateGreater.setDate(dateGreater.getDate() - 300);
  let groups = yield CourseGroup.find({
    teacher: this.isAdmin ? {$exists: true} : this.user._id,
    dateEnd: {
      $gt: dateGreater // finished not more than 300 days
    }
  }).sort({dateStart: -1});

  for (let i = 0; i < groups.length; i++) {
    let group = groups[i];

    variants.push({
      value:   'courseGroup:' + group.id,
      text: group.title
    });
  }

  return variants;
}

exports.getList = function*() {

  this.locals.title = "Рассылки";

  let query = this.isAdmin ? {} : {
    user: this.user
  };

  this.locals.newsletterReleases = yield NewsletterRelease.find(query)
    .sort({created: -1})
    .populate('user to.courseGroup to.newsletter to.mailList');

  this.locals.sidebar = yield* admin.getUserSidebar(this.user);

  this.body = this.render('admin/newsletterReleases');

};

exports.edit = function*() {

  let newsletterRelease;

  if (this.params.id) {
    newsletterRelease = yield* loadById.call(this, this.params.id);
  } else {
    newsletterRelease = new NewsletterRelease({});
  }

  this.locals.title = this.params.id ? "Редактировать рассылку" : "Создать рассылку";

  yield* renderForm.call(this, newsletterRelease);

};

function* renderForm(newsletterRelease) {

  this.locals.failedReasons = yield* getFailedReasons(newsletterRelease);

  this.locals.toVariants = yield* getToVariants.call(this);

  let templates = yield NewsletterTemplate.find({
    user: this.user
  }).sort({created: -1});

  this.locals.templates = templates.map(template => ({
    value: template.id,
    text: template.title
  }));

  this.locals.letterSentCount = yield Letter.count({
    labelId: newsletterRelease._id,
    sent:    true
  });

  this.locals.form = {
    id:              this.params.id ? this.params.id : '',
    title:           newsletterRelease.title,
    content:         newsletterRelease.content,
    to:              newsletterRelease.to,
    sendScheduledAt: newsletterRelease.sendScheduledAt,
    sendFinished:    newsletterRelease.sendFinished,
    sendingPid:      newsletterRelease.sendingPid
  };


  this.locals.sidebar = yield* admin.getUserSidebar(this.user);

  this.body = this.render('admin/newsletterRelease');
}


exports.post = function*() {

  let newsletterRelease;

  if (this.request.body.id) {
    newsletterRelease = yield* loadById.call(this, this.request.body.id);
  } else {
    newsletterRelease = new NewsletterRelease({
      user: this.user
    });
  }

  // process delete early before reading (maybe invalid, no one cares) data
  if (this.request.body.action == 'delete') {
    let letterExists = yield Letter.findOne({
      labelId: newsletterRelease._id
    });

    if (letterExists) {
      this.addFlashMessage('error', 'Есть отосланные письма этой рассылки, удаление невозможно.');
      this.redirect('/newsletter/admin/newsletter-releases/edit/' + newsletterRelease.id);
    } else {
      yield newsletterRelease.remove();
      this.addFlashMessage('success', 'Рассылка удалена.');
      this.redirect('/newsletter/admin/newsletter-releases');
    }
    return;
  }

  // can have skips (to-1 to-2 to-3 then removed to-2)
  // toOptions= [ 'newsletter:5523d48d77d8f3225c0fb74e', , 'newsletter:5523d48d77d8f3225c0fb74d']
  // toExclude= [   , true,  ]
  let toOptions = [];
  let toExclude = [];
  for (let key in this.request.body) {
    if (key.startsWith('to-exclude-')) {
      toExclude[key.slice('to-exclude-'.length)] = true;
    } else if (key.startsWith('to-') && this.request.body[key]) {
      toOptions[key.slice('to-'.length)] = this.request.body[key];
    }
  }

  let to = [];
  for (let i = 0; i < toOptions.length; i++) {
    if (!toOptions[i]) continue;
    let optionParts = toOptions[i].split(':');
    let type = optionParts[0];
    let id = optionParts[1];
    let toItem = {
      [type]:  id,
      exclude: toExclude[i] || false
    };
    to.push(toItem);
  }

  newsletterRelease.content = this.request.body.content;
  newsletterRelease.title = this.request.body.title;

  if (!newsletterRelease.sendFinished) {
    newsletterRelease.to = to;
  }

  // save the data, then apply actions
  try {
    yield newsletterRelease.validate();
  } catch (e) {
    if (e.name != 'ValidationError') throw e;

    var errors = this.locals.errors = {};
    for (var key in e.errors) {
      errors[key] = e.errors[key].message;
    }

    this.status = 400;
    if (this.accepts('html', 'json') == 'html') {
      this.locals.title = "Редактировать рассылку";
      yield* renderForm.call(this, newsletterRelease);
    } else {
      this.body = {errors};
    }
    return;

  }

  switch (this.request.body.action) {
  case 'save':
    yield newsletterRelease.persist();
    this.addFlashMessage('success', 'Рассылка сохранена.');
    // already saved
    break;

  case 'delete':
    // delete is handled above
    throw new Error("Must never reach here");

  case 'template':
    let newsletterTemplate = yield NewsletterTemplate.create({
      user:    this.user,
      title:   newsletterRelease.title,
      content: newsletterRelease.content
    });

    this.addFlashMessage('success', 'Шаблон готов.');
    this.redirect('/newsletter/admin/newsletter-templates/edit/' + newsletterTemplate.id);
    break;

  case 'send':
    switch(this.request.body.sendType) {
    case 'now':
      yield newsletterRelease.persist({
        sendScheduledAt: new Date()
      });

      this.addFlashMessage('success', 'Рассылка будет отослана в ближайшее время.');
      break;
    case '5min':
      let datePlus = new Date();
      datePlus.setMinutes(datePlus.getMinutes() + 5);
      yield newsletterRelease.persist({
        sendScheduledAt: datePlus
      });

      this.addFlashMessage('success', 'Рассылка будет отослана через 5 минут.');
      break;
    case 'schedule':
      console.log(this.request, this.request.body);
      let dateStr = this.request.body.sendDate || moment().format('YYYY-MM-DD');
      let timeStr = this.request.body.sendTime || moment().format('HH:mm');

      let dateSplit = dateStr.split('-');
      let dateSchedule = new Date(dateSplit[0], dateSplit[1]-1, dateSplit[2], ...timeStr.split(':'));

      this.log.debug("newsletter scheduled at", dateSchedule, dateStr, timeStr);
      yield newsletterRelease.persist({
        sendScheduledAt: dateSchedule
      });

      this.addFlashMessage('success',
        'Рассылка будет отослана ' + moment(dateSchedule).format('YYYY-MM-DD HH:mm')
      );

      break;
    }
    break;

  case 'cancelSend':
    newsletterRelease.sendScheduledAt = undefined;
    yield newsletterRelease.persist();


    let isStopped;

    if (newsletterRelease.sendingPid) {
      isStopped = false;
      let dateTill = Date.now() + 5000;
      while (true) { // wait till cancelled, so that the user will see a cancelled NL on refresh
        let maybeStopped = yield NewsletterRelease.findById(newsletterRelease._id, {sendingPid: 1});
        if (!maybeStopped.sendingPid) {
          isStopped = true;
          break;
        }
        this.log.debug("Still sending...");

        if (Date.now() > dateTill) {
          break;
        }

        yield function(callback) {
          setTimeout(callback, 700);
        };
      }
    } else {
      isStopped = true;
    }

    if (isStopped) {
      this.addFlashMessage('success', 'Рассылка отменена.');
    } else {
      this.addFlashMessage('success', 'Рассылку отменить не удалось, возможно она "подвисла".');
    }

    break;


  case 'preview':
    yield NewsletterRelease.populate(newsletterRelease, 'to.courseGroup to.newsletter to.mailList');


    let previewLetter = yield* formatTestLetter(newsletterRelease, this.user.email);
    this.body = previewLetter.message.html;
    return;

  case 'sendOne':
    // AJAX
    let email = this.request.body.sendOneEmail.toLowerCase();
    if (!email) {
      this.status = 400;
      this.body = {
        errors: {
          email: 'Нет указан email'
        }
      };
      return;
    }
    yield NewsletterRelease.populate(newsletterRelease, 'user to.courseGroup to.newsletter to.mailList');

    let letter = yield* formatTestLetter(newsletterRelease, email);
    yield* mailer.sendLetter(letter);

    this.body = {
      message: `Письмо отослано ${email}.`
    };
    return;
  }

  this.redirect('/newsletter/admin/newsletter-releases/edit/' + newsletterRelease.id);


};
