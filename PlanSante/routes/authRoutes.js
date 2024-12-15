const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');

router.get('/signup', authController.getSignupPage); // Now points to the getSignupPage method
router.post('/signup', authController.signup);

router.get('/signin', authController.getSigninPage); // Now points to the getSigninPage method
router.post('/signin', authController.signin);

router.get('/logout', authController.logout); // Now points to the logout method

module.exports = router;
