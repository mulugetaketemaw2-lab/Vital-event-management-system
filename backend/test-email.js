require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
  }
});

console.log('Testing SMTP connection...');
console.log('Config:', {
  user: process.env.EMAIL_USER || process.env.SMTP_USER,
  pass: '********'
});

transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Connection Successful!');

    const targetEmail = process.argv[2] || process.env.EMAIL_USER || process.env.SMTP_USER;

    const mailOptions = {
      from: `"Test" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
      to: targetEmail,
      subject: 'SMTP Test Email',
      text: `This is a test email sent to ${targetEmail} to verify SMTP configuration.`
    };

    console.log('Sending test email...');
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Send Email Error:', error);
      } else {
        console.log('Email Sent Successfully:', info.messageId);
      }
      process.exit();
    });
  }
});
