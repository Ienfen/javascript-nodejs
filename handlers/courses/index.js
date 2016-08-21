
var mountHandlerMiddleware = require('lib/mountHandlerMiddleware');

exports.init = function(app) {

  app.multipartParser.ignore.add('/courses/groups/:groupBySlug/materials');
  app.multipartParser.ignore.add('/courses/admin/transactions/:transactionNumber');

  app.use(mountHandlerMiddleware('/courses', __dirname));
};

exports.Course = require('./models/course');
exports.CourseGroup = require('./models/courseGroup');
exports.CourseParticipant = require('./models/courseParticipant');
exports.CourseTeacher = require('./models/courseTeacher');
exports.CourseInvite = require('./models/courseInvite');
exports.CourseFeedback = require('./models/courseFeedback');

exports.onPaid = require('./lib/onPaid');
exports.cancelIfPendingTooLong = require('./lib/cancelIfPendingTooLong');

exports.getAgreement = require('./lib/getAgreement');

exports.getGroupAmount = require('./lib/getGroupAmount');
exports.getGroupOrderCounts = require('./lib/getGroupOrderCounts');
exports.createOrderFromTemplate = require('./lib/createOrderFromTemplate');

exports.patch = require('./lib/patch');
exports.formatOrderForProfile = require('./lib/formatOrderForProfile');

require('./lib/registerParticipants'); // registers middleware for user save
