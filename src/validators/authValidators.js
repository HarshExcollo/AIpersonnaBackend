const { body } = require('express-validator');

exports.registerValidator = [
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

exports.loginValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.forgotPasswordValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
];

exports.verifyOtpValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits'),
];

exports.resetPasswordValidator = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('otp').isLength({ min: 4, max: 6 }).withMessage('OTP must be 4-6 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
]; 