const merge = require('lodash/merge');

module.exports = merge(
  require('./user'),
  require('./newsletter'),
  require('./payments'),
  require('./course'),
  require('./migrationState'),
  require('./videoKey'),
  require('./slack')
);
