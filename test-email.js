const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: process.env.SMTP_USER, // send to yourself for testing
  subject: 'Test Email',
  text: 'This is a test email from AI-Personaa backend.'
}, (err, info) => {
  if (err) {
    return console.error('Error sending email:', err);
  }
  console.log('Email sent:', info.response);
}); 