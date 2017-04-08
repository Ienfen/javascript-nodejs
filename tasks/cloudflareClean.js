const gulp = require('gulp');
const request = require('co-request');
const config = require('config');
const co = require('co');
const args = require('yargs');
const log = require('log')();
const Cloudflare = require('cloudflare');
const assert = require('assert');

function* cleanDomain(domain) {

  var client = new Cloudflare({
    email: config.cloudflare.email,
    key: config.cloudflare.apiKey
  });

  let cfDomain = domain.split('.').slice(-2).join('.');

  let zone = yield client.browseZones({name: cfDomain});

  zone = zone.result[0];

  let result = yield client.deleteCache(zone, {purge_everything: true});

  assert(result);
}

module.exports = function(options) {

  var domains = options.domains;
  return function() {

    return co(function*() {

      for (var i = 0; i < domains.length; i++) {
        var domain = domains[i];

        log.info("Cloudfare clean", domain);
        yield cleanDomain(domain);
      }

    });

  };

};

