'use strict';

const gulp = require('gulp');

const request = require('request-promise');
const co = require('co');
const fs = require('fs');
const config = require('config');

module.exports = function() {

  return function() {
    return co(function*() {
      let mochaInfo = yield request({
        url: 'https://api.cdnjs.com/libraries/mocha',
        json: true
      });

      let mochaJS = yield request(`https://cdnjs.cloudflare.com/ajax/libs/mocha/${mochaInfo.version}/mocha.js`);
      let mochaCSS = yield request(`https://cdnjs.cloudflare.com/ajax/libs/mocha/${mochaInfo.version}/mocha.css`);

      mochaCSS += "\n#mocha pre.error {white-space: pre-wrap;}\n";

      let sinonInfo = yield request({
        url: 'https://api.cdnjs.com/libraries/sinon.js',
        json: true
      });

      let sinonJS = yield request(`https://cdnjs.cloudflare.com/ajax/libs/sinon.js/${sinonInfo.version}/sinon.js`);


      let chaiInfo = yield request({
        url: 'https://api.cdnjs.com/libraries/chai',
        json: true
      });

      let chaiJS = yield request(`https://cdnjs.cloudflare.com/ajax/libs/chai/${chaiInfo.version}/chai.js`);

      let testJS = `${sinonJS}
        ${chaiJS}
        var assert = chai.assert;
        
        ${mochaJS}
        mocha.setup('bdd');
        
        // inline mocha CSS into JS
        var code = ${JSON.stringify(mochaCSS)};
        var style = document.createElement('style');
        if (style.styleSheet) { // IE
          style.styleSheet.cssText = code;
        } else { // Other browsers
          style.innerHTML = code;
        }
        document.getElementsByTagName('head')[0].appendChild(style);
        
        // run tests onload, hide the part of an error stack which goes into mocha
        window.addEventListener('load', function() {
          if (!document.getElementById('mocha')) document.body.id = 'mocha';
          mocha.setup({ timeout: 600e3 });
          mocha.run(function() {
            var errors = document.querySelectorAll('#mocha .error');
            for(var i=0; i<errors.length; i++) {
              errors[i].innerHTML = errors[i].innerHTML.replace(/\\n\\s+at Test.Runnable.run[\\s\\S]*/, '');
            }
          });
        }, false)
      `;

      fs.writeFileSync(config.assetsRoot + '/test/libs.js', testJS);

      console.log('Done');
    });

  };
};


