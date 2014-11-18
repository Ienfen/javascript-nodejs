/**
 * This file must be required at least ONCE.
 * After it's done, one can use require('mongoose')
 *
 * In web-app: this is done at init phase
 * In tests: in mocha.opts
 * In gulpfile: in beginning
 */

var mongoose = require('mongoose');
var path = require('path');
var fs = require('fs');
var log = require('log')();
var autoIncrement = require('mongoose-auto-increment');
var ValidationError = require('mongoose/lib/error').ValidationError;
var ValidatorError = require('mongoose/lib/error').ValidatorError;

//mongoose.set('debug', true);

var config = require('config');
var _ = require('lodash');

mongoose.connect(config.mongoose.uri, config.mongoose.options);

autoIncrement.initialize(mongoose.connection);

// bind context now for thunkify without bind
_.bindAll(mongoose.connection);
_.bindAll(mongoose.connection.db);

// plugin from https://github.com/LearnBoost/mongoose/issues/1859
// yield.. .persist() or .destroy() for generators instead of save/remove
// mongoose 3.10 will not need that (!)
mongoose.plugin(function(schema) {
  schema.methods.persist = function(body) {
    var model = this;

    return function(callback) {
      if (body) model.set(body);
      model.save(function(err, changed) {

        if (err && err.code == 11000) {

          var indexName = err.message.match(/\$(\w+)/)[1];

          model.collection.getIndexes(function(err2, indexes) {
            if (err2) return callback(err);

            // e.g. [ [displayName, 1], [email, 1] ]
            var indexInfo = indexes[indexName];

            // e.g. { displayName: 1, email: 1 }
            var indexFields = {};
            indexInfo.forEach(function toObject(item) {
              indexFields[item[0]] = item[1];
            });

            var schemaIndexes = schema.indexes();

            //console.log("idxes:", schemaIndexes, "idxf", indexFields, schemaIndexes.find);
            var schemaIndex = null;

            for (var i = 0; i < schemaIndexes.length; i++) {
              if (_.isEqual(schemaIndexes[i][0], indexFields)) {
                schemaIndex = schemaIndexes[i];
                break;
              }
            }

            if (!schemaIndex) {
              return callback(new Error("schema needs index.errorMessage for unique plugin"));
            }

            // schema index object, e.g
            // { unique: 1, sparse: 1 ... }
            var schemaIndexInfo = schemaIndex[1];

            var errorMessage = schemaIndexInfo.errorMessage || ("Index error: " + indexName);

            var valError = new ValidationError(err);
            var field = indexInfo[0][0]; // if many fields in uniq index - we take the 1st one for error

            // example:
            // err = { path="email", message="Email is not unique", type="notunique", value=model.email }
            valError.errors[field] = new ValidatorError(field, errorMessage, 'notunique', model[field]);

            return callback(valError);
          });

        } else {
          callback(err, changed);
        }

      });
    };
  };
  schema.methods.destroy = function() {
    var model = this;

    return function(callback) {
      model.remove(callback);
    };
  };

  schema.statics.destroy = function(query) {
    return function(callback) {
      this.remove(query, callback);
    }.bind(this);
  };
});

mongoose.waitConnect = function(callback) {
  console.log('m1');
  if (mongoose.connection.readyState == 1) {
    console.log('m2');
    setImmediate(callback);
  } else {
    console.log('m3');
    // we wait either for an error
    // OR
    // for a successful connection
    //console.log("MONGOOSE", mongoose, "CONNECTION", mongoose.connection, "ON", mongoose.connection.on);
    mongoose.connection.on("connected", onConnected);
    console.log("m31");
    mongoose.connection.on("error", onError);
    console.log("m32");
  }

  function onConnected() {
    console.log('m4');
    log.debug("Mongoose has just connected");
    cleanUp();
    callback();
  }

  function onError(err) {
    console.log('m5');
    log.debug('Failed to connect to DB', err);
    cleanUp();
    callback(err);
  }

  function cleanUp() {
    console.log('m6');
    mongoose.connection.removeListener("connected", onConnected);
    mongoose.connection.removeListener("error", onError);
  }

  console.log("M7");
};

module.exports = mongoose;
