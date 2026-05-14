const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
  }
});

// Verify connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service configuration error:', error);
  } else {
    console.log('✅ Email service is ready to send messages');
  }
});

// Email templates
const emailTemplates = {
  registrationApproval: (userName, role) => ({
    subject: 'Registration Approved - Vital Events System',
    text: `Dear ${userName},\n\nYour registration as ${role} has been approved. You can now login to the Vital Events Recording System.\n\nBest regards,\nVital Events System Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Registration Approved</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your registration as <strong>${role}</strong> has been approved.</p>
        <p>You can now login to the Vital Events Recording System.</p>
        <p style="margin-top: 30px;">Best regards,<br>Vital Events System Team</p>
      </div>
    `
  }),

  certificateReady: (userName, eventType, certificateId) => ({
    subject: 'Certificate Ready for Download',
    text: `Dear ${userName},\n\nYour ${eventType} certificate (ID: ${certificateId}) is ready for download. Please login to your account to access it.\n\nBest regards,\nVital Events System Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Certificate Ready</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your <strong>${eventType}</strong> certificate is ready for download.</p>
        <p><strong>Certificate ID:</strong> ${certificateId}</p>
        <p>Please login to your account to access and download your certificate.</p>
        <p style="margin-top: 30px;">Best regards,<br>Vital Events System Team</p>
      </div>
    `
  }),

  passwordReset: (userName, resetToken, frontendUrl) => ({
    subject: 'Password Reset Request - Vital Events System',
    text: `Dear ${userName},\n\nYou requested a password reset. Click the link below to reset your password:\n\n${frontendUrl}/reset-password/${resetToken}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nVital Events System Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Password Reset Request</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>You requested a password reset. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${frontendUrl}/reset-password/${resetToken}" 
             style="background-color: #2c5282; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        <p style="margin-top: 30px;">Best regards,<br>Vital Events System Team</p>
      </div>
    `
  }),

  eventSubmitted: (userName, eventType, eventId) => ({
    subject: 'Event Submitted Successfully',
    text: `Dear ${userName},\n\nYour ${eventType} event (ID: ${eventId}) has been submitted successfully and is pending review.\n\nYou will receive a notification once it's approved.\n\nBest regards,\nVital Events System Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Event Submitted Successfully</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your <strong>${eventType}</strong> event has been submitted successfully.</p>
        <p><strong>Event ID:</strong> ${eventId}</p>
        <p>Your submission is pending review. You will receive a notification once it's approved.</p>
        <p style="margin-top: 30px;">Best regards,<br>Vital Events System Team</p>
      </div>
    `
  }),

  eventApproved: (userName, eventType, eventId) => ({
    subject: 'Event Approved - Vital Events System',
    text: `Dear ${userName},\n\nYour ${eventType} event (ID: ${eventId}) has been approved.\n\nYou can now proceed to request a certificate if needed.\n\nBest regards,\nVital Events System Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Event Approved</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your <strong>${eventType}</strong> event has been approved.</p>
        <p><strong>Event ID:</strong> ${eventId}</p>
        <p>You can now proceed to request a certificate if needed.</p>
        <p style="margin-top: 30px;">Best regards,<br>Vital Events System Team</p>
      </div>
    `
  }),

  eventRejected: (userName, eventType, eventId, reason) => ({
    subject: 'Event Requires Attention - Vital Events System',
    text: `Dear ${userName},\n\nYour ${eventType} event (ID: ${eventId}) requires attention.\n\nReason: ${reason}\n\nPlease review and resubmit with the necessary corrections.\n\nBest regards,\nVital Events System Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c53030;">Event Requires Attention</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your <strong>${eventType}</strong> event requires attention.</p>
        <p><strong>Event ID:</strong> ${eventId}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please review and resubmit with the necessary corrections.</p>
        <p style="margin-top: 30px;">Best regards,<br>Vital Events System Team</p>
      </div>
    `
  }),

  welcomeEmail: (userName, role) => ({
    subject: 'Welcome to Vital Events Recording System',
    text: `Dear ${userName},\n\nWelcome to the Vital Events Recording System!\n\nYour account as ${role} has been created successfully. You can now login and start using the system.\n\nBest regards,\nVital Events System Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5282;">Welcome to Vital Events Recording System</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Welcome! Your account as <strong>${role}</strong> has been created successfully.</p>
        <p>You can now login and start using the system.</p>
        <p style="margin-top: 30px;">Best regards,<br>Vital Events System Team</p>
      </div>
    `
  })
};

// Main send email function
const sendEmail = async (to, templateName, templateData = {}) => {
  try {
    if (!(process.env.EMAIL_USER || process.env.SMTP_USER) || !(process.env.EMAIL_PASS || process.env.SMTP_PASS)) {
      console.warn('⚠️ Email credentials not configured. Email not sent.');
      return { success: false, message: 'Email service not configured' };
    }

    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    const emailContent = template(...Object.values(templateData));

    const mailOptions = {
      from: `"Vital Events System" <${process.env.SMTP_USER}>`,
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Convenience functions for specific email types
const emailService = {
  sendRegistrationApproval: (to, userName, role) =>
    sendEmail(to, 'registrationApproval', { userName, role }),

  sendCertificateReady: (to, userName, eventType, certificateId) =>
    sendEmail(to, 'certificateReady', { userName, eventType, certificateId }),

  sendPasswordReset: (to, userName, resetToken) => {
    const baseUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'null'
      ? process.env.FRONTEND_URL
      : 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
    console.log(`🔗 [Service] Generated Reset URL: ${resetUrl}`);

    return sendEmail(to, 'passwordReset', {
      userName,
      resetToken,
      frontendUrl: baseUrl
    });
  },

  sendEventSubmitted: (to, userName, eventType, eventId) =>
    sendEmail(to, 'eventSubmitted', { userName, eventType, eventId }),

  sendEventApproved: (to, userName, eventType, eventId) =>
    sendEmail(to, 'eventApproved', { userName, eventType, eventId }),

  sendEventRejected: (to, userName, eventType, eventId, reason) =>
    sendEmail(to, 'eventRejected', { userName, eventType, eventId, reason }),

  sendWelcomeEmail: (to, userName, role) =>
    sendEmail(to, 'welcomeEmail', { userName, role }),

  // Generic send for custom emails
  sendCustomEmail: async (to, subject, text, html) => {
    try {
      const mailOptions = {
        from: `"Vital Events System" <${process.env.EMAIL_USER || process.env.SMTP_USER}>`,
        to,
        subject,
        text,
        html: html || text
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Custom email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending custom email:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = emailService;
