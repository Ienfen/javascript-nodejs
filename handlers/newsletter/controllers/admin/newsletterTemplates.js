'use strict';

require('mdeditor');
const NewsletterTemplate = require('../../models/newsletterTemplate');
const ObjectId = require('lib/mongoose').Types.ObjectId;
let getUserSidebar = require('admin').getUserSidebar;

exports.getList = function*() {
  this.locals.title = "Шаблоны групповых рассылок";

  this.locals.templates = yield NewsletterTemplate.find({
    user: this.user
  }).sort({created: -1});

  this.locals.sidebar = yield* getUserSidebar(this.user);

  this.body = this.render('admin/newsletterTemplates');
};

function* loadTemplate(id) {
  if (!ObjectId.isValid(id)) {
    this.throw(400);
  }

  let letterTemplate = yield NewsletterTemplate.findById(id);
  if (!letterTemplate) {
    this.throw(404);
  }
  if (!this.isAdmin && !letterTemplate.user.equals(this.user._id)) {
    this.throw(403);
  }

  return letterTemplate;
}

exports.post = function*() {

  let letterTemplate;
  if (this.request.body.id) {
    letterTemplate = yield loadTemplate.call(this, this.request.body.id);
  } else {

    letterTemplate = new NewsletterTemplate({
      user:    this.user
    });

  }

  if (this.request.body.action == 'delete' && letterTemplate) {
    yield letterTemplate.remove();
    this.addFlashMessage('success', 'Шаблон удалён.');

    this.redirect('/newsletter/admin/newsletter-templates');
    return;
  }


  let form = this.locals.form = {
    content: this.request.body.content,
    title: this.request.body.title,
    id: this.request.body.id
  };

  letterTemplate.content = form.content;
  letterTemplate.title = form.title;

  try {
    yield letterTemplate.persist();
    this.addFlashMessage('success', 'Шаблон успешно сохранён.');

    this.redirect('/newsletter/admin/newsletter-templates');
  } catch (e) {
    if (e.name != 'ValidationError') throw e;

    var errors = this.locals.errors = {};
    for (var key in e.errors) {
      errors[key] = e.errors[key].message;
    }

    this.locals.title = "Редактировать шаблон";

    this.locals.sidebar = yield* getUserSidebar(this.user);

    this.body = this.render('admin/newsletterTemplate');
  }


};

exports.get = function*() {

  let letterTemplate = yield* loadTemplate.call(this, this.params.id);

  if (this.accepts('json')) {
    this.body = {
      title:   letterTemplate.title,
      content: letterTemplate.content
    };
  } else {
    this.throw(502);
  }
};

exports.edit = function*() {

  let letterTemplate;

  if (this.params.id) {
    letterTemplate = yield* loadTemplate.call(this, this.params.id);
  }

  this.locals.title = letterTemplate ? "Редактировать шаблон" : "Создать шаблон";

  this.locals.form = {
    title: letterTemplate ? letterTemplate.title : '',
    content: letterTemplate ? letterTemplate.content : '',
    id: letterTemplate ? letterTemplate.id : ''
  };

  this.locals.sidebar = yield* getUserSidebar(this.user);

  this.body = this.render('admin/newsletterTemplate');
};
