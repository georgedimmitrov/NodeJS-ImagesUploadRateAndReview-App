const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid Email Address'],
    required: 'Please supply an email address',
  },
  name: {
    type: String,
    required: 'Please supply a name',
    trim: true,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // hearts - array of _ids related to an 'Image'
  hearts: [
    { type: mongoose.Schema.ObjectId, ref: 'Store' }
  ]
});

// virtual field for gravatar setup
userSchema.virtual('gravatar').get(function() {
  // this === User
  const hash = md5(this.email);
  return `https://gravatar.com/avatar/${hash}?s=200`;
});

// use passport to login with email. Exposes a method .register() to us.
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });

// having unique: true - required gives an ugly error, this changes it to something nicer
userSchema.plugin(mongodbErrorHandler);

module.exports = mongoose.model('User', userSchema);
