const path = require('path');
const request = require('supertest');
const app = require('app');
const ImgurImage = require('../../models/imgurImage');
const User = require('users').User;
const fixtures = require(path.join(__dirname, '../../fixtures/user'));
const db = require('lib/dataUtil');

describe('imgur', function() {

  var server;
  var user;

  before(function*() {
    yield ImgurImage.remove({});
    yield* db.loadModels(fixtures, {reset: true});

    user = yield User.findOne({});

    server = app.listen();
  });

  after(function() {
    server.close();
  });

  describe('POST /imgur/upload', function() {

    it('returns id after uploading a valid image', function(done) {
      request(server)
        .post('/imgur/upload')
        .set('X-Test-User-Id', fixtures.User[0]._id)
        .attach('photo', path.join(__dirname, '../test.png'), 'test.png')
        .expect(200)
        .end(function(err, res) {
          if (err) return done(err);
          res.body.imgurId.should.exist;
          res.body.link.should.exist;
          done();
        });
    });

    it('fails to upload a non-image', function(done) {
      request(server)
        .post('/imgur/upload')
        .set('X-Test-User-Id', fixtures.User[0]._id)
        .attach('photo', __filename, 'test.png')
        .expect(400, done);
    });
  });

});
