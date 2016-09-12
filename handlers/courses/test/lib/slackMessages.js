const should = require('should');

const { parseMessages } = require('../../lib/slackMessages');
const fixtures = require('../fixtures/messages');

const getMessage = text => parseMessages([{text}]);

describe.only('convert slack message formatting into markdown', () => {
  Object.keys(fixtures).forEach(key => {
    // bold, italic, etc.
    describe(key, () => {
      it(`should convert ${key}`, function*() {
        const messages = yield* getMessage(fixtures[key].original);

        messages[0].text.should.equal(fixtures[key].converted);
      });
    });
  });
});
