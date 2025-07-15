const nodemailer = require('nodemailer');
const config = require('../config');

console.log('SMTP Host:', config.smtpHost); // Debug log

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: false,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

exports.sendOtpEmail = async (to, otp) => {
  const mailOptions = {
    from: config.smtpFrom,
    to,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}`,
    html: `<p>Your OTP code is: <b>${otp}</b></p>`
  };
  return transporter.sendMail(mailOptions);
}; 