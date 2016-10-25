const mongoose = require('mongoose');
const Article = require('tutorial').Article;
const Task = require('tutorial').Task;
const ArticleRenderer = require('tutorial').ArticleRenderer;
const TaskRenderer = require('tutorial').TaskRenderer;
const _ = require('lodash');

exports.get = function *get(next) {

  var topArticle;

  if (this.params.slug == 'more') {
    topArticle = new Article({
      title: 'Дополнительно',
      slug: 'more',
      content: '',
      isFolder: true
    });
  } else {
    topArticle = yield Article.findOne({slug: this.params.slug}).exec();
  }

  if (!topArticle) {
    this.throw(404);
  }

  var ebookType = this.url.match(/\w+/)[0]; // pdf or epub

  // gather all articles in locals.children array linearly with shifted headers
  var renderer = new ArticleRenderer();

  var renderedTop = yield* renderArticle(renderer, topArticle, ebookType, 0, true);

  if (renderedTop.tasks.length) {
    renderedTop.hasTasks = true;
  }

  var locals = {
    title:       topArticle.title,
    ebookType:   ebookType
  };

  locals.children = [renderedTop];

  const tree = yield* Article.findTree({
    query: Article.find({}).sort({weight: 1})
  });

  if (topArticle.slug == 'more') {
    // add virtual "more" article and make non-js/ui articles its children
    topArticle.children = [];
    tree.articles[topArticle._id.toString()] = topArticle;
    for (var id in tree.articles) {
      var article = tree.articles[id];
      if (!article.parent && !~['js', 'ui', 'more'].indexOf(article.slug)) {
        article.parent = topArticle._id;
        topArticle.children.push(article);
      }

    }
  }


  const topArticleInTree = tree.byId(topArticle._id);

  locals.topArticleInTree = topArticleInTree;

  if (topArticleInTree.isFolder) {
    var children = topArticleInTree.children || [];

    for (var i = 0; i < children.length; i++) {
      var child = children[i];

      var renderedChild = yield* renderArticle(renderer, child, ebookType, 1);

      locals.children.push(renderedChild);

      if (renderedChild.tasks.length) {
        renderedChild.hasTasks = true;
        renderedTop.hasTasks = true;
      }

      if (child.isFolder) {
        var children2 = child.children || [];
        for (var j = 0; j < children2.length; j++) {
          var subChild = children2[j];

          var renderedSubChild = yield* renderArticle(renderer, subChild, ebookType, 2);

          locals.children.push(renderedSubChild);
          if (renderedSubChild.tasks.length) {
            renderedSubChild.hasTasks = true;
            renderedChild.hasTasks = true;
            renderedTop.hasTasks = true;
          }
        }
      }

    }

  }

  // gather all head/foot data from the renderer, all libs etc
  locals.head = renderer.getHead();

  //console.log(require('util').inspect(locals, {depth: 7}));

  locals.SITE_HOST = process.env.SITE_HOST;

  this.body = this.render("bookify", locals);

};

function *renderArticle(renderer, article, ebookType, headerLevelShift) {

  //console.log("render", article.title);

  var rendered = yield* renderer.render(article, {
    headerLevelShift: headerLevelShift,
    //linkHeaderTag:    true,
    linkHeaderTag:    false,
    //noStripTitle:     true,
    translitAnchors:  true,
    ebookType:        ebookType
  });

  rendered.isFolder = article.isFolder;
  rendered.title = article.title;
  rendered.weight = article.weight;
  rendered.url = Article.getUrlBySlug(article.slug);
  rendered.modified = article.modified;
  rendered.level = headerLevelShift;
  rendered.url = article.getUrl();

  // rendered.content = '<p>Текст статьи ' + rendered.title + '</p>';
  delete rendered.head;
  delete rendered.foot;

  rendered.tasks = yield* renderTasks(article, ebookType);

  article.renderedWithTitle = rendered;

  return rendered;
}


function *renderTasks(article, ebookType) {
  var tasks = yield Task.find({
    parent: article._id
  }).sort({weight: 1}).exec();

  const taskRenderer = new TaskRenderer();

  var renderedTasks = [];

  for (var i = 0; i < tasks.length; i++) {
    var task = tasks[i];

    var taskRendered = yield* taskRenderer.render(task, {
      ebookType: ebookType
    });
    renderedTasks.push({
      url:        task.getUrl(),
      title:      task.title,
      importance: task.importance,
      content:    taskRendered.content,
      solution:   taskRendered.solution
    });

  }

  return renderedTasks;

}


