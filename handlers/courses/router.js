'use strict';

const Router = require('koa-router');
const mustBeAuthenticated = require('auth').mustBeAuthenticated;
const mustBeParticipantOrTeacher = require('./lib/mustBeParticipantOrTeacher');
const mustBeParticipant = require('./lib/mustBeParticipant');
const mustBeTeacher = require('./lib/mustBeTeacher');
const mustBeTeacherOrAdmin = require('./lib/mustBeTeacherOrAdmin');
const mustBeAdmin = require('auth').mustBeAdmin;
const router = module.exports = new Router();

function* hasRoleTeacher(next) {
  if (this.user && this.user.hasRole('teacher')) {
    yield* next;
  } else {
    this.throw(403);
  }
}


router.param('userById', require('users').routeUserById);
router.param('groupBySlug', require('./lib/routeGroupBySlug'));

router.get('/register-participants/:groupBySlug', mustBeAdmin, require('./controller/registerParticipants').get);


router.get('/', require('./controller/frontpage').get);

router.get('/feedback-fetch', require('./controller/courseFeedbackFetch').get);

router.get('/:course', require('./controller/course').get);

// same controller for new signups & existing orders
router.get('/groups/:groupBySlug/signup', require('./controller/signup').get);
router.get('/orders/:orderNumber(\\d+)', require('./controller/signup').get);

router.get('/admin/orders/:orderNumber(\\d+)?', mustBeAdmin, require('./controller/admin/orders').get);
router.post('/admin/orders/:orderNumber(\\d+)', mustBeAdmin, require('./controller/admin/orders').post);
router.post('/admin/transactions/:transactionNumber(\\d+)', mustBeAdmin, require('./controller/admin/transactions').post);

router.post('/admin/invites', mustBeAdmin, require('./controller/admin/invites').post);
router.post('/admin/participants', mustBeAdmin, require('./controller/admin/participants').post);
router.get('/admin/groups', mustBeAdmin, require('./controller/admin/groups').get);

router.get('/groups/:groupBySlug/info', mustBeParticipantOrTeacher, require('./controller/groupInfo').get);
router.get('/groups/:groupBySlug/materials', mustBeParticipantOrTeacher, require('./controller/groupMaterials').get);
router.get('/groups/:groupBySlug/participants-info', mustBeTeacherOrAdmin, require('./controller/participantsInfo').get);
router.post('/groups/:groupBySlug/materials', mustBeTeacher, require('./controller/groupMaterials').post);
router.del('/groups/:groupBySlug/materials', mustBeTeacher, require('./controller/groupMaterials').del);

router.get('/groups/:groupBySlug/logs/:logName', mustBeParticipantOrTeacher, require('./controller/groupLogs').get);

router.get('/groups/:groupBySlug/ical', require('./controller/groupIcal').get);



// not groups/:groupBySlug/* url,
// because the prefix /course/download must be constant for nginx to proxy *.zip to node
router.get('/download/:groupBySlug/:filename', mustBeParticipantOrTeacher, require('./controller/groupMaterialsDownload').get);

router.all('/groups/:groupBySlug/feedback', require('./controller/groupFeedbackEdit').all);
router.all('/feedback/edit/:feedbackNumber(\\d+)', require('./controller/groupFeedbackEdit').all);

router.get('/:course/feedback', require('./controller/courseFeedback').get);

router.patch('/feedback/comment', mustBeAuthenticated, require('./controller/groupFeedbackComment').patch);
router.get('/feedback/:feedbackNumber(\\d+)', require('./controller/groupFeedbackShow').get);

router.patch('/participants', require('./controller/participants').patch);
router.get('/download/participant/:participantId/certificate.jpg', mustBeAuthenticated, require('./controller/participantCertificateDownload').get);

router.post('/groups/:groupBySlug/slack-invite', mustBeAuthenticated, require('./controller/groupSlackInvite').post);

router.get('/groups/dropbox-link', mustBeAuthenticated, require('./controller/groupDropboxLink').get);

router.get('/groups/:groupBySlug/dropbox-share', mustBeParticipant, require('./controller/groupDropboxShare').get);
router.post('/groups/:groupBySlug/dropbox-share', mustBeParticipant, require('./controller/groupDropboxShare').post);

router.get('/groups/api/participants', require('./controller/api/participants').get);

router.get('/teacher/group-create', hasRoleTeacher, require('./controller/teacher/groupCreate').get);
router.get('/teacher/groups', hasRoleTeacher, require('./controller/teacher/groups').get);
router.post('/teacher/group-create', hasRoleTeacher, require('./controller/teacher/groupCreate').post);
router.get('/teacher/instructions', hasRoleTeacher, require('./controller/teacher/instructions').get);

router.get('/teacher/cron', require('./controller/teacher/cron').get);

router.all('/invite/:inviteToken?', require('./controller/invite').all);

// for profile
router.get('/profile/:userById', mustBeAuthenticated, require('./controller/coursesByUser').get);

