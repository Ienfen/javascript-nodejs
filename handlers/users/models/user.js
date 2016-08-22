var transliterate = require('textUtil/transliterate');
var validate = require('validate');
var mongoose = require('lib/mongoose');
var Schema = mongoose.Schema;
var hash = require('../lib/hash');
var mongooseTimestamp = require('lib/mongooseTimestamp');
var _ = require('lodash');
var co = require('co');
var ucWordStart = require('textUtil/ucWordStart');

var ProviderSchema = new mongoose.Schema({
  name:    String,
  nameId:  {
    type:  String,
    index: true
  },
  profile: {} // updates just fine if I replace it with a new value, w/o going inside
});

var UserSchema = new mongoose.Schema({
  displayName:   {
    type:     String,
    trim:     true,
    default:  "", // need a value for validator to run
    validate: [
      {
        validator: function(value) {
          //console.log("VALIDATING", this.deleted, value, this.deleted ? true : (value.length > 0));
          return this.deleted ? true : (value.length >= 2);
        },
        msg:       "Имя пользователя должно иметь не менее 2 символов."
      },
      {
        validator: function(value) {
          if (!value) return true;
          return value.length <= 256;
        },
        msg:       "Имя пользователя должно быть не длиннее 256 символов."
      }
    ]
  },

  gotowebinar: { },

  email:         {
    type:      String,
    lowercase: true,
    trim:      true,
    default:   "", // need a value for validator to run
    // если посетитель удалён, то у него нет email!
    validate:  [
      {
        validator: function checkNonEmpty(value) {
          return this.deleted ? true : (value.length > 0);
        },
        msg:       "E-mail пользователя не должен быть пустым."
      },
      {
        validator: function checkEmail(value) {
          return this.deleted ? true : validate.patterns.email.test(value);
        },
        msg:       'Укажите, пожалуйста, корректный email.'
      }
    ],

    // sparse (don't index users without email)
    // dangerous: if mongodb uses this in queries (that search emails only), users w/o email will be ignored
    index: {
      unique:       true,
      sparse:       true,
      errorMessage: "Такой e-mail уже используется."
    }
  },
  passwordHash:  {
    type: String // user may have no password if used facebook to login/register
  },
  salt:          {
    type: String
  },
  providers:     [ProviderSchema],
  gender:        {
    type: String,
    enum: {
      values:  ['male', 'female'],
      message: "Неизвестное значение для пола."
    }
  },
  profileLabel: { // label in profileGuest below the avatar
    type: String
  },
  profileName:   {
    type:     String,
    validate: [
      {
        validator: function(value) {
          // also checks required
          if (this.deleted) return true;
          return value && value.length >= 2;
        },
        msg:       "Минимальная длина имени профиля: 2 символа."
      },
      {
        validator: function(value) {
          return this.deleted || /^[a-z0-9-]*$/.test(value);
        },
        msg:       "В имени профиля допустимы только буквы a-z, цифры и дефис."
      },
      {
        validator: function(value) {
          // if no value, this validator passes (another one triggers the error)
          return this.deleted || !value || value.length <= 64;
        },
        msg:       "Максимальная длина имени профиля: 64 символа."
      }
    ],

    index: {
      unique:       true,
      sparse:       true,
      errorMessage: "Такое имя профиля уже используется."
    }
  },
  realName:      {
    type: String,
    trim: true
  },
  // not Date, because Date requires time zone,
  // so if I enter 18.04.1982 00:00:00 in GMT+3 zone, it will be 17.04.1982 21:00 actually (prbably wrong)
  // string is like a "date w/o time zone"
  birthday:      {
    type: String,
    trim: true
  },
  verifiedEmail: {
    type:    Boolean,
    default: false
  },

  // e.g. ['orders', 'quiz'], the profile tabs which have info
  // a tab is enabled by the associated module when it generates data
  profileTabsEnabled: [String],

  // we store all verified emails of the user for the history & account restoration issues
  verifiedEmailsHistory: [{date: Date, email: String}],

  // new not-yet-verified email, set on change attempt
  pendingVerifyEmail: String,

  // impossible-to-guess token
  // used on both new user & email change
  // new user:
  //  - generate a random roken
  //  - keep/resend on verification attempts (so that a user can use any letter, that's convenient)
  // email change:
  //  - generate a random token
  //  - regenerate on change attempts (if entered a wrong email, next letter will void the previous one)
  // cleared after use
  verifyEmailToken:          {
    type:  String,
    index: true
  },
  verifyEmailRedirect:       String, // where to redirect after verify
  passwordResetToken:        {  // refresh with each recovery request
    type:  String,
    index: true
  },
  passwordResetTokenExpires: Date, // valid until this date
  passwordResetRedirect:     String, // where to redirect after password recovery
  photo:                     String, // imgur photo link
  country:                   {
    type: String
  },
  town:                      {
    type: String
  },
  // Email for teacher communication
  // NOT hidden unlike `email`
  teacherEmail:              {
    type:      String,
    lowercase: true,
    trim:      true,
    validate:  [
      {
        validator: function checkEmail(value) {
          return !value ? true : validate.patterns.email.test(value);
        },
        msg:       'Укажите, пожалуйста, корректный email.'
      }
    ]
  },

  teacherAgreement: {
    enabled: Boolean,
    contragentHead: String,
    contragentFooter: String,
    contragentName: String,
    contragentSignShortName: String,
  },

  publicEmail:               {
    type:      String,
    lowercase: true,
    trim:      true,
    validate:  [
      {
        validator: function checkEmail(value) {
          return !value ? true : validate.patterns.email.test(value);
        },
        msg:       'Укажите, пожалуйста, корректный email.'
      }
    ]
  },
  interests:                 {
    type: String,
    trim: true
  },

  // DEPRECATED
  teachesCourses:            {
    type:    [{
      type: Schema.Types.ObjectId,
      ref:  'Course'
    }],
    default: []
  },
  isTeacherFrontpage: {
    type: Boolean,
    index: true
  },

  aboutMe:                   {
    type:      String,
    maxlength: 600,
    trim:      true
  },
  deleted:                   { // private & login data is deleted
    type:    Boolean,
    default: false
  },
  readOnly:                  Boolean,  // data is not deleted, just flagged as banned
  roles:                     { // admin, teacher, qaModerator?
    type:    [{
      type:      String,
      lowercase: true,
      trim:      true
    }],
    index:   true,
    default: []
  },
  emailSignature:            String, // for teachers, normally a user cannot send an email
  isAdmin:                   Boolean, // deprecated in favor of roles['Admin']
  lastActivity:              Date
  /* created, modified from plugin */
});

UserSchema.virtual('password')
  .set(function(password) {

    if (password !== undefined) {
      if (password.length < 4) {
        this.invalidate('password', 'Пароль должен быть минимум 4 символа.');
      }
    }

    this._plainPassword = password;

    if (password) {
      this.salt = hash.createSalt();
      this.passwordHash = hash.createHashSlow(password, this.salt);
    } else {
      // remove password (unable to login w/ password any more, but can use providers)
      this.salt = undefined;
      this.passwordHash = undefined;
    }
  })
  .get(function() {
    return this._plainPassword;
  });

// get all fields available to a visitor (except the secret/internal ones)
// normally in-page JS has access to these
UserSchema.methods.getInfoFields = function() {
  return User.getInfoFields(this);
};


UserSchema.statics.getInfoFields = function(user) {
  return {
    id:                 user._id,
    hasPassword:        Boolean(user.passwordHash),
    displayName:        user.displayName,
    profileName:        user.profileName,
    gender:             user.gender,
    birthday:           user.birthday,
    country:            user.country,
    town:               user.town,
    teacherEmail:       user.teacherEmail,
    emailSignature:     user.emailSignature,
    publicEmail:        user.publicEmail,
    interests:          user.interests,
    email:              user.email,
    verifiedEmail:      user.verifiedEmail,
    photo:              user.photo,
    deleted:            user.deleted,
    readOnly:           user.readOnly,
    created:            user.created,
    lastActivity:       user.lastActivity,
    profileTabsEnabled: user.profileTabsEnabled,
    aboutMe:            user.aboutMe,
    teachesCourses:     user.teachesCourses,
    isTeacher:          user.hasRole('teacher')
  };
};


UserSchema.methods.getProfileUrl = function() {
  return '/profile/' + this.profileName;
};

UserSchema.methods.hasRole = function(role) {
  return this.roles.indexOf(role) != -1;
};

UserSchema.methods.checkPassword = function(password) {
  if (!password) return false; // empty password means no login by password
  if (!this.passwordHash) return false; // this user does not have password (the line below would hang!)

  return hash.createHashSlow(password, this.salt) == this.passwordHash;
};


UserSchema.methods.softDelete = function*() {
  // delete this.email does not work
  // need to assign to undefined to $unset
  this.aboutMe = undefined;
  this.email = undefined;
  this.realName = undefined;
  this.displayName = 'Аккаунт удалён';
  this.gender = undefined;
  this.birthday = undefined;
  this.profileName = undefined;
  this.verifyEmailToken = undefined;
  this.verifyEmailRedirect = undefined;
  this.created = undefined;
  this.lastActivity = undefined;
  this.passwordResetToken = undefined;
  this.passwordResetTokenExpires = undefined;
  this.passwordResetRedirect = undefined;
  this.providers = [];
  this.password = undefined;
  this.verifiedEmailsHistory = [];
  this.verifiedEmail = false;
  this.teachesCourses = undefined;
  this.teacherEmail = undefined;
  this.photo = undefined;
  // keep verifiedEmail status as it was, maybe for some displays?
  //  user.verifiedEmail = false;

  this.deleted = true;

  yield this.persist();
};

UserSchema.statics.photoDefault = "//i.imgur.com/zSGftLc.png";
UserSchema.statics.photoDeleted = "//i.imgur.com/7KZD6XK.png";

UserSchema.methods.getPhotoUrl = function(width, height) {
  var url = this.deleted ? User.photoDeleted :
    !this.photo ? User.photoDefault : this.photo;

  if (!width && !height) return url;

  // I don't resize to square, because it breaks background
  // @see http://i.imgur.com/zSGftLcs.png
  var modifier = (width <= 80 && height < 80) ? 't' :
    (width <= 160 && height <= 160) ? 'm' :
      (width <= 320 && height <= 320) ? 'i' :
        (width <= 512 && height <= 512) ? 'h' : '';

  return url.slice(0, url.lastIndexOf('.')) + modifier + url.slice(url.lastIndexOf('.'));
};


UserSchema.methods.generateProfileName = function*() {
  var profileName = this.displayName.trim()
    .toLowerCase()
    .replace(/<\/?[a-z].*?>/gim, '')  // strip tags, leave /<DIGIT/ like: "IE<123"
    .replace(/[ \t\n!"#$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~]/g, '-') // пунктуация, пробелы -> дефис
    .replace(/[^a-zа-яё0-9-]/gi, '') // убрать любые символы, кроме [слов цифр дефиса])
    .replace(/-+/gi, '-') // слить дефисы вместе
    .replace(/^-|-$/g, ''); // убрать дефисы с концов

  profileName = transliterate(profileName);

  while (profileName.length < 2) profileName += '-';

  var existingUser;
  while (true) {
    existingUser = yield User.findOne({profileName: profileName}).exec();

    if (!existingUser) break;
    // add one more random digit and retry the search
    profileName += Math.random() * 10 ^ 0;
  }


  this.profileName = profileName;
};

UserSchema.pre('save', function(next) {
  if (this.deleted || this.profileName) return next();

  co(function*() {
    yield* this.generateProfileName();
  }.bind(this)).then(next, next);
});


UserSchema.pre('save', function(next) {
  if (this.deleted) return next();

  if (this.hasRole('teacher') && !this.teacherEmail) {
    this.invalidate('teacherEmail', 'Не указан адрес teacherEmail.');
  }
  next();
});


UserSchema.pre('save', function(next) {
  if (this.aboutMe) this.aboutMe = this.aboutMe.slice(0, 600);

  if (this.city) {
    this.city = ucWordStart(this.city);
  }
  if (this.country) {
    this.country = ucWordStart(this.country);
  }
  next();
});


UserSchema.plugin(mongooseTimestamp);

// all references using mongoose.model for safe recreation
// when I recreate model (for tests) => I can reload it from mongoose.model (single source of truth)
// exports are less convenient to update
var User = module.exports = mongoose.model('User', UserSchema);

