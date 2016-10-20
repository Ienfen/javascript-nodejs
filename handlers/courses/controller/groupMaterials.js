'use strict';

var bytes = require('bytes');
var Course = require('../models/course');
var sendMail = require('mailer').send;
var path = require('path');
var CourseGroup = require('../models/courseGroup');
var CourseParticipant = require('../models/courseParticipant');
var multiparty = require('multiparty');
var config = require('config');
var fs = require('mz/fs');
var fse = require('fs-extra');
var transliterate = require('textUtil/transliterate');
var exec = require('child_process').exec;
var glob = require('glob');
var iprotect = require('iprotect');
var moment = require('momentWithLocale');
var stripTags = require('textUtil/stripTags');

// Group info for a participant, with user instructions on how to login
exports.get = function*() {

  var group = this.locals.group = this.groupBySlug;

  if (!group.materials) {
    this.throw(404);
  }

  this.locals.title = "Материалы для обучения\n" + group.title;

  this.locals.participant = this.participant;

  this.locals.teacher = this.teacher;

  var materials = this.locals.materials = [];
  for (var i = 0; i < group.materials.length; i++) {
    var material = group.materials[i];
    materials.push({
      title:   material.title,
      created: material.created,
      filename: material.filename,
      comment: material.comment || '',
      url:     group.getMaterialUrl(material),
      size:    bytes(yield* group.getMaterialFileSize(material))
    });
  }

  let logs;
  try {
    logs = yield fs.readdir(config.jabberLogsRoot + '/' + group.webinarId);
  } catch (e) { // no logs
    logs = [];
  }

  logs = logs.sort().reverse();

  let contents = yield logs.map(file => fs.readFile(config.jabberLogsRoot + '/' + group.webinarId + '/' + file, {encoding: 'utf8'}));

  this.locals.chatLogs = [];
  for (let i = 0; i < logs.length; i++) {
    let log = logs[i];
    if (!contents[i].match(/<body>([\s\S]*?)(<\/body>|$)/)) {
      continue;
    }
    let content = contents[i]
        .match(/<body>([\s\S]*?)(<\/body>|$)/)[0]
        .replace(/<font[\s\S]*?<\/font>/gim, '')
        .replace(/<a[\s\S]*?<\/a>/gim, '')
        .replace(/<div[\s\S]*?<\/div>/gim, '')
        .replace(/<br.*?>/gim, '');
    content = stripTags(content);

    content = content.replace(/\s+/gim, ' ');

    if (content.length > 500) {
      this.locals.chatLogs.push({
        title: log,
        link:  `/courses/groups/${group.slug}/logs/${log.replace(/\.html$/, '')}`
      });
    }
  }


  this.body = this.render('groupMaterials');
};

exports.del = function*() {

  let group = this.groupBySlug;
  let found = false;

  for (let i = 0; i < group.materials.length; i++) {
    console.log(group.materials[i].filename, this.request.body.filename);
    if (group.materials[i].filename == this.request.body.filename) {
      found = true;
      group.materials.splice(i--, 1);
      break;
    }
  }

  if (!found) {
    this.throw(404, 'No such file');
  }

  yield group.persist();
  this.body = 'ok';

};

exports.post = function*() {

  this.res.setTimeout(3600 * 1e3, () => { // default timeout is too small
    this.res.end("Timeout");
  });
  var group = this.groupBySlug;

  let files = [];
  yield new Promise((resolve, reject) => {

    var form = new multiparty.Form({
      autoFields:   true,
      autoFiles:    true,
      maxFilesSize: 512 * 1024 * 1024 // 512MB max file size
    });

    // multipart file must be the last
    form.on('file', (name, file) => {
      if (!file.originalFilename) return; // empty file field
      // name is "materials" always
      files.push(file);
    });

    form.on('error', reject);

    form.on('field', (name, value) => {
      this.request.body[name] = value;
    });

    form.on('close', resolve);

    form.parse(this.req);
  });

  /*
   file example: (@see multiparty)
   { fieldName: 'materials',
   originalFilename: '10_types_intro_protected.zip',
   path: '/var/folders/41/nsmzxxxn0fx7c656wngnq_wh0000gn/T/3o-PzBrAMsX5W35KZ5JH0HKw.zip',
   headers:
   { 'content-disposition': 'form-data; name="materials"; filename="10_types_intro_protected.zip"',
   'content-type': 'application/zip' },
   size: 14746520 }
   */


  // now process files

  let materialsFileBasenameStem = this.request.body.filename ?
    transliterate(this.request.body.filename).replace(/[^-_\w\d]/gim, '') :
    moment().format('YYYY_MM_DD_HHmm');

  let materialsFileBasename = materialsFileBasenameStem + '.zip';

  let processedMaterialsZip;
  try {
    processedMaterialsZip = yield* processFiles.call(this, materialsFileBasenameStem, files);
  } catch (e) {
    this.log.debug(e);
    // error, so delete all tmp files
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      yield fs.unlink(file.path);
    }
    this.addFlashMessage('error', e.message);
    this.redirect(this.originalUrl);
    return;
  }


  // store uploaded files in archive under the title chosen by uploader
  let archiveDir = config.archiveRoot + '/groupMaterials/' + Date.now() + '/' + materialsFileBasenameStem;
  yield function(callback) {
    fse.ensureDir(archiveDir, callback);
  };

  // use original names
  for (let i = 0; i < files.length; i++) {
    let file = files[i];
    let originalFilename = transliterate(file.originalFilename).replace(/[^\d\w_.-]/gim, '');
    yield* move(file.path, path.join(archiveDir, originalFilename));
    this.log.debug("Moved to archive", file.path, '->', path.join(archiveDir, originalFilename));
  }

  // move zipped materials to download dir
  let filePath = `${config.downloadRoot}/courses/${group.slug}/${materialsFileBasename}`;

  yield function(callback) {
    fse.ensureDir(path.dirname(filePath), callback);
  };

  yield* move(processedMaterialsZip, filePath);

  this.log.debug("Moved zipped result to", filePath);

  // update the database
  var participants = yield CourseParticipant.find({
    isActive:              true,
    shouldNotifyMaterials: true,
    group:                 group._id
  }).populate('user');

  // remove old material with the same name (Adding the same file replaces it)
  for (let i = 0; i < group.materials.length; i++) {
    if (group.materials[i].filename == materialsFileBasename) {
      group.materials.splice(i--, 1);
    }
  }

  var material = {
    title:    materialsFileBasenameStem,
    filename: materialsFileBasename,
    comment:  this.request.body.comment
  };

  group.materials.unshift(material);

  yield group.persist();

  if (this.request.body.notify) {

    var recipients = participants
      .map(function(participant) {
        return {address: participant.user.email, name: participant.fullName};
      });

    for (let i = 0; i < recipients.length; i++) {
      let to = recipients[i];

      yield* sendMail({
        templatePath: path.join(__dirname, '../templates/email/materials'),
        subject:      "Добавлены материалы курса",
        to:           to,
        comment:      material.comment,
        link:         config.server.siteHost + `/courses/groups/${group.slug}/materials`,
        fileLink:     config.server.siteHost + `/courses/download/${group.slug}/${material.filename}`,
        fileTitle:    material.title
      });


    }

    this.addFlashMessage('success', 'Материал добавлен, уведомления разосланы.');
  } else {
    this.addFlashMessage('success', 'Материал добавлен, уведомления НЕ рассылались.');
  }
  this.redirect(this.originalUrl);
};

function* clean() {

  let entries = [];
  yield function(callback) {
    let g = new glob.Glob(config.tmpRoot + '/groupMaterials/*', {stat: true}, callback);
    g.on('stat', function(dir, stat) {
      // get entries modified more than 1 day ago
      if (stat.mtime < Date.now() - 86400 * 1e3) entries.push(dir);
    });
  };

  this.log.debug("clean", entries);
  for (let i = 0; i < entries.length; i++) {
    yield function(callback) {
      fse.remove(entries[i], callback);
    };
  }
}

function* processFiles(name, files) {

  yield* clean.call(this);

  let workingDir = config.tmpRoot + '/groupMaterials/' + Date.now() + '/' + name;
  yield function(cb) {
    fse.ensureDir(workingDir, cb);
  };

  let jobs = [];

  const tutorialFiles = ["01_dom_nodes.mp4","02_dom_console.mp4","03_traversing_dom.mp4","04_basic_dom_node_properties.mp4","05_attributes_and_custom_properties.mp4","06_searching_elements_dom.mp4","07_modifying_document.mp4","08_multi_insert.mp4","09_document_write.mp4","10_styles_and_classes.mp4","11_metrics.mp4","12_metrics_window.mp4","13_coordinates.mp4","14_introduction_browser_events.mp4","15_obtaining_event_object.mp4","js","01_intro.mp4","02_alternatives.mp4","03_browsers.mp4","04_editor.mp4","05_editor_advanced.mp4","06_hello.mp4","07_structure.mp4","08_variables.mp4","09_variable_names.mp4","10_types_intro.mp4","11_operators.mp4","12_comparison.mp4","13_uibasic.mp4","14_ifelse.mp4","15_logical_ops.mp4","16_while_for.mp4","17_break_continue.mp4","18_switch.mp4","19_function_basics.mp4","20_recursion.mp4","21_javascript_specials.mp4","22_debugging_chrome.mp4","23_strings.mp4","24_number.mp4","25_types_conversion.mp4","26_object.mp4","27_array.mp4","28_array_methods.mp4","29_datetime.mp4","30_function_is_value.mp4","31_function_declaration_expression.mp4","32_named_function_expression.mp4","33_global_object.mp4","34_closures.mp4","35_closures_usage.mp4","36_static_variables.mp4","37_with.mp4","38_arguments_pseudoarray.mp4","39_arguments-named.mp4","40_object_methods.mp4","41_this.mp4","42_decorators.mp4","43_object_conversion.mp4","44_type_detection.mp4"];

  for (let i = 0; i < files.length; i++) {
    let file = files[i];

    let originalFilename = transliterate(file.originalFilename).replace(/[^\d\w_.-]/gim, '');

    if (originalFilename.match(/\.zip$/)) {
      // extract directly to workingdir
      //let extractDir = path.join(workingDir, originalFilename.replace(/\.zip$/, ''));
      //yield fs.mkdir(extractDir);
      jobs.push((callback) => {
        exec(`unzip -nq ${file.path} -d ${workingDir}`, (error, stdout, stderr) => {
          if (stderr) {
            callback(new Error(stderr));
          } else {
            this.log.debug(stdout);
            callback(null, stdout);
          }
        });
      });
    } else if (originalFilename.match(/\.mp4$/) && tutorialFiles.indexOf(originalFilename) == -1) {
      jobs.push(iprotect.protect(originalFilename.replace(/\.mp4$/, ''), file.path, workingDir));
    } else {
      let filePath = path.join(workingDir, originalFilename);
      jobs.push(function(callback) {
        fse.copy(file.path, filePath, callback);
      });
    }

  }

  yield jobs;

  yield function(callback) {
    exec(`chmod -R 777 ${workingDir}`, callback);
  };

  yield function(callback) {
    exec(`zip -r ${name} ${name}`, {cwd: path.dirname(workingDir)}, callback);
  };

  yield function(callback) {
    fse.remove(workingDir, callback);
  };

  return workingDir + '.zip';

}


// fs.rename does not work across devices/mount points
function* move(src, dst) {
  yield function(callback) {
    fse.copy(src, dst, callback);
  };
  yield fs.unlink(src);
}
