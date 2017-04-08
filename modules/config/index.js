// make sure Promise is wrapped early,
// to assign mongoose.Promise = global.Promise the wrapped variant any time later
var path = require('path');
var fs = require('fs');
var env = process.env;
var yaml = require('js-yaml');

// NODE_ENV = development || test || production
env.NODE_ENV = env.NODE_ENV || 'development';

//if (!env.SITE_HOST) throw new Error("env.SITE_HOST is not set");
//if (!env.STATIC_HOST) throw new Error("env.STATIC_HOST is not set");

var secret = require('./secret');

var lang = env.NODE_LANG || 'ru';

require('util').inspect.defaultOptions.depth = 3;

if (env.DEV_TRACE) {
  Error.stackTraceLimit = 100000;
  require('trace');
  require('clarify');
}

var config = module.exports = {
  // production domain, for tutorial imports, descriptions, etc
  // for the places where in-dev we must use a real domain
  domain: {
    main:   lang == 'en' ? 'javascript.info' : 'learn.javascript.ru',
    static: lang == 'en' ? 'en.js.cx' : 'js.cx'
  },

  adminMail: lang == 'en' ? 'iliakan@javascript.info' : 'mk@javascript.ru',

  server: {
    port:       env.PORT || 3000,
    host:       env.HOST || '127.0.0.1',
    siteHost:   env.SITE_HOST || '',
    staticHost: env.STATIC_HOST || ''
  },


  aws: {
    region:          secret.aws.region,
    accessKeyId:     secret.aws.AWSAccessKeyId,
    secretAccessKey: secret.aws.AWSSecretKey
  },

  ga: {
    id: lang == 'ru' ? 'UA-2056213-16' : 'UA-2056213-15'
  },

  yandexMetrika: {
    id: lang == 'ru' ? 17649010 : 32184394
  },

  slack: {
    token: secret.slack.token,
    org:   secret.slack.org,
    bot:   secret.slack.bot,
    email: 'mk@javascript.ru',
    host:  '127.0.0.1',
    port:  3001
  },

  dropbox: secret.dropbox,

  test: {
    e2e: {
      sshHost:  secret.test.e2e.sshHost, // remote host for testing e2e callbacks
      sshUser:  secret.test.e2e.sshUser,
      siteHost: secret.test.e2e.siteHost,
      browser:  env.E2E_BROWSER || 'firefox'
    }
  },

  mongoose: require('./mongoose'),

  cloudflare: {
    url:    'https://www.cloudflare.com/api_json.html',
    apiKey: secret.cloudflare.apiKey,
    email:  secret.cloudflare.email
  },

  recaptcha: {
    id:     secret.recaptcha.id,
    secret: secret.recaptcha.secret
  },

  gmail: {
    user:     secret.gmail.user,
    password: secret.gmail.password
  },

  xmpp: {
    server: 'javascript.ru',
    admin:  secret.xmpp.admin
  },

  appKeys:  [secret.sessionKey],
  auth:     {
    session:    {
      key:     'sid',
      prefix:  'sess:',
      cookie:  {
        httpOnly:  true,
        path:      '/',
        overwrite: true,
        signed:    true,
        maxAge:    3600 * 4 * 1e3 // session expires in 4 hours, remember me lives longer
      },
      // touch session.updatedAt in DB & reset cookie on every visit to prolong the session
      // koa-session-mongoose resaves the session as a whole, not just a single field
      rolling: true
    },
    rememberMe: {
      key:    'remember',
      cookie: {
        httpOnly:  true,
        path:      '/',
        overwrite: true,
        signed:    true,
        maxAge:    7 * 3600 * 24 * 1e3 // 7days
      }
    },

    providers: require('./authProviders')
  },
  payments: require('./payments'),

  iprotect: secret.iprotect,
  imgur:    secret.imgur,
  adminKey: secret.adminKey,

  certDir: path.join(secret.dir, 'cert'),
  secretDir: secret.dir,

  disqus: {
    domain: lang == 'en' ? 'javascriptinfo' : 'learnjavascriptru'
  },


  openexchangerates: {
    appId: secret.openexchangerates.appId
  },

  gotowebinar: secret.gotowebinar,

  jb: {
    email: env.NODE_ENV == 'production' ? secret.jb.email : 'iliakan@gmail.com'
  },

  lang:    lang,
  elastic: {
    host: 'http://localhost:9200'
  },

  plnkrAuthId: secret.plnkrAuthId,

  assetVersioning: env.ASSET_VERSIONING == 'file' ? 'file' :
                     env.ASSET_VERSIONING == 'query' ? 'query' : null,

  mailer: require('./mailer'),

  jade:   {
    basedir: path.join(process.cwd(), 'templates'),
    cache:   env.NODE_ENV != 'development'
  },
  crypto: {
    hash: {
      length:     128,
      // may be slow(!): iterations = 12000 take ~60ms to generate strong password
      iterations: env.NODE_ENV == 'test' ? 1 : 12000
    }
  },

  deploy: {
    user:             'root',
    privateKey:       fs.existsSync(path.join(secret.dir, 'js_rsa')) ? fs.readFileSync(path.join(secret.dir, 'js_rsa')) : '',
    buildPath:        "/js/build",
    targetPath:       "/js/javascript-nodejs",
    productionBranch: "production-" + lang,
    repo:             "git@github.com:iliakan/javascript-nodejs.git"
  },

  github: {
    secret: secret.github.secret
  },

  sauceLabs: {
    username:  secret.sauceLabs.username,
    accessKey: secret.sauceLabs.accessKey,
    address:   'http://ondemand.saucelabs.com:80/wd/hub'
  },

  projectRoot:           process.cwd(),
  // public files, served by nginx
  publicRoot:            path.join(process.cwd(), 'public'),
  assetsRoot:            path.join(process.cwd(), 'assets'),
  // private files, for expiring links, not directly accessible
  downloadRoot:          path.join(process.cwd(), 'download'),
  jabberLogsRoot:        path.join(process.cwd(), 'jabber-logs'),
  archiveRoot:           path.join(process.cwd(), 'archive'),
  tmpRoot:               path.join(process.cwd(), 'tmp'),
  localesRoot:           path.join(process.cwd(), 'locales'),
  // js/css build versions
  manifestRoot:          path.join(process.cwd(), 'manifest'),
  migrationsRoot:        path.join(process.cwd(), 'migrations'),
  tutorialGithubBaseUrl: 'https://github.com/iliakan/javascript-tutorial/blob/' + lang,

  handlers: require('./handlers')
};

require.extensions['.yml'] = function(module, filename) {
  module.exports = yaml.safeLoad(fs.readFileSync(filename, 'utf-8'));
};


// webpack config uses general config
// we have a loop dep here
config.webpack = require('./webpack')(config);

const t = require('i18n');
t.requirePhrase('site', require(path.join(config.localesRoot, 'site', config.lang + '.yml')));

if (process.env.NODE_ENV == 'test') {
  require('money').rates = {
    USD: 1,
    EUR: 1,
    UAH: 1,
    RUB: 1
  };
}
