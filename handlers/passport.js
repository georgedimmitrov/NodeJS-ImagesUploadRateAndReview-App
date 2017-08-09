const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');

passport.use(User.createStrategy());

// every single request if user is logged in we attach the User to the .req object
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
