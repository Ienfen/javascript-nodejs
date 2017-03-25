var multiparty = require('multiparty');
const config = require('config');
var uploadStream = require('../lib/uploadStream');
var co = require('co');
var ImgurImage = require('../models/imgurImage');
var BadImageError = require('../lib/badImageError');

exports.post = function*() {

  var self = this;

  if (process.env.IMGUR_DISABLED) {
    this.body = {
      imgurId: (Math.random() * 1e6 ^ 0).toString(36),
      link:    '//assets/img/logo_' + config.lang + '.png'
    };
    return;
  }

  var imgurImage;
  try {
    imgurImage = yield new Promise(function(resolve, reject) {

      var form = new multiparty.Form();

      // multipart file must be the last
      form.on('part', function(part) {
        self.log.debug("Part", part.name, part.filename);

        if (!part.filename) {
          reject(new Error("No filename for form part " + part.name));
          return;
        }

        co(function*() {
          // filename='blob' for FormData(photo, blob) where blob comes from canvas.toBlob
          return yield* uploadStream(part.filename, part.byteCount, part);
        }).then(function(result) {
          resolve(result);
        }).catch(reject);
      });

      form.on('error', reject);

      form.parse(self.req);

    });
  } catch (e) {
    if (e instanceof BadImageError) {
      this.status = 400;
      this.body = e.message;
      return;
    } else {
      throw e;
    }
  }


  this.body = {
    link:    imgurImage.link,
    imgurId: imgurImage.imgurId
  };

};
