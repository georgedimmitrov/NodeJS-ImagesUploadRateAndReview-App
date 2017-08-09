const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const { catchErrors } = require('../handlers/errorHandlers');

// homepage
router.get('/', catchErrors(imageController.getImages));
router.get('/images', catchErrors(imageController.getImages));
router.get('/images/page/:page', catchErrors(imageController.getImages));
router.get('/add', authController.isLoggedIn, imageController.addImage);

router.post('/add',
  imageController.upload,
  catchErrors(imageController.resize),
  catchErrors(imageController.createImage),
);

router.post('/add/:id',
  imageController.upload,
  catchErrors(imageController.resize),
  catchErrors(imageController.updateImage),
);

router.get('/images/:id/edit', catchErrors(imageController.editImage));
router.get('/image/:slug', catchErrors(imageController.getImageBySlug));

// tags
router.get('/tags', catchErrors(imageController.getImagesByTag));
router.get('/tags/:tag', catchErrors(imageController.getImagesByTag));

// hearts
router.get('/hearts', authController.isLoggedIn, catchErrors(imageController.getHearts));

// User Registration/Login and whatsoever
router.get('/login', userController.loginForm);
router.post('/login', authController.login);

router.get('/register', userController.registerForm);

router.post('/register',
  userController.validateRegister, // 1. validate the registration data
  catchErrors(userController.register), // 2. register the user
  authController.login, // 3. log them in
);

router.get('/logout', authController.logout);

router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token',
  authController.confirmedPasswords, // check if passwords match
  catchErrors(authController.update), // update password
);

// reviews
router.post('/reviews/:id',
  authController.isLoggedIn,
  catchErrors(reviewController.addReview)
);

// top
router.get('/top', catchErrors(imageController.getTopImages));

/* API */
router.get('/api/search', catchErrors(imageController.searchImages));
router.post('/api/images/:id/heart', catchErrors(imageController.heartImage));

module.exports = router;
