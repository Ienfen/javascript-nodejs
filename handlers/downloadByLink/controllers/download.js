const path = require('path');

const ExpiringDownloadLink = require('../models/expiringDownloadLink');

exports.get = function*() {

  var linkId = this.params.linkId;

  var downloadLink = yield ExpiringDownloadLink.findOne({
    linkId: linkId
  });

  if (!downloadLink) {
    this.throw(404);
  }

  this.set({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': 'attachment; filename=' + path.basename(downloadLink.relativePath),
    'X-Accel-Redirect': '/_download/' + downloadLink.relativePath
  });

  this.body = '';
};
