const rateLimit = require('express-rate-limit');

exports.authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute
  message: { error: 'Too many requests, please try again later.' },
});

exports.otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 OTP requests per minute
  message: { error: 'Too many OTP requests, please try again later.' },
}); 