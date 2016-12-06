const should = require('should');

const { formatMessage } = require('../../lib/slackMessages');
const fixtures = require('../fixtures/messages');

const getMessage = text => formatMessage({text}, []);

describe('convert slack message formatting into markdown', () => {
  Object.keys(fixtures).forEach(key => {
    // bold, italic, etc.
    describe(key, () => {
      it(`should convert ${key}`, () => {
        const message = getMessage(fixtures[key].original);
        message.should.equal(fixtures[key].converted);
      });
    });
  });
});
