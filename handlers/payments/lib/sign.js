const path = require('path');
const fs = require('mz/fs');
const fse = require('fs-extra');

const config = require('config');
const exec = require('mz/child_process').exec;
const log = require('log')();

module.exports = function*(docBuffer) {

  let tempDir = yield new Promise((ok, fail) => fs.mkdtemp('/tmp/sign-', (err, result) => err ? fail(err) : ok(result)));
  let filePath = path.join(tempDir, 'sign.doc');
  yield fs.writeFile(filePath, docBuffer);
  let signOptions = JSON.stringify({
    files:     [filePath],
    outputDir: tempDir
  }).replace(/"/g, '\\"');

  let cmd = `java -jar ${path.join(config.secretDir, 'sign.jar')} "${signOptions}"`;

  log.debug(cmd);

  let result = yield exec(cmd);

// array of lines
  result = result.join('');

  log.debug(result);

  result = JSON.parse(result);

  let resultFilePath = result[filePath];
  let file = yield fs.readFile(resultFilePath);

  yield new Promise((ok, fail) => fse.remove(tempDir, err => err ? fail(err) : ok()));

  return file;

};
