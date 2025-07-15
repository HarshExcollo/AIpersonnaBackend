const nodemailer = require('nodemailer');
const config = require('../config');

console.log('SMTP Host:', config.smtpHost);
console.log('SMTP User:', config.smtpUser);

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: false,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

// No OTP email logic needed for normal auth 