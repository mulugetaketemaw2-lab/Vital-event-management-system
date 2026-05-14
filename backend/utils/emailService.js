const nodemailer = require('nodemailer');

// Create reusable transporter using SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || process.env.SMTP_USER,
      pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
    }
  });
};

/**
 * Send registration approval notification email
 */
const sendApprovalEmail = async (citizen) => {
  try {
    const email = citizen.personalInfo?.email;
    if (!email) {
      console.log('⚠️ No email address found for citizen, skipping email notification.');
      return { success: false, reason: 'no_email' };
    }

    const fullName = `${citizen.personalInfo?.firstName || ''} ${citizen.personalInfo?.lastName || ''}`.trim();

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Ethiopia Vital Events System" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@vitalevents.gov.et'}>`,
      to: email,
      subject: '✅ Registration Approved – Certificate Ready',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0d6efd, #0b5ed7); padding: 30px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">🇪🇹 Ethiopia Vital Events System</h1>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #198754; margin-top: 0;">Registration Approved ✅</h2>
            <p style="font-size: 16px; color: #333;">Dear <strong>${fullName}</strong>,</p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              Your registration process has been <strong style="color: #198754;">successfully completed</strong>. 
              Your certificate has been generated and is now ready.
            </p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              You may log in to your dashboard to view and download it.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background: #0d6efd; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Login to Dashboard
              </a>
            </div>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #198754;">
              <p style="margin: 0; font-size: 14px; color: #2e7d32;">
                <strong>Username:</strong> ${citizen.username}<br>
                <strong>Status:</strong> Approved & Active
              </p>
            </div>
          </div>
          <div style="background: #e9ecef; padding: 15px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
              © ${new Date().getFullYear()} Ethiopia Vital Events System. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Approval email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const fullName = `${citizen.personalInfo?.firstName || ''} ${citizen.personalInfo?.lastName || ''}`.trim();
      console.log('\n--- 📧 [DEVELOPMENT] APPROVAL EMAIL ---');
      console.log(`To: ${citizen.personalInfo?.email}`);
      console.log(`Subject: ✅ Registration Approved – Certificate Ready`);
      console.log(`Recipient: ${fullName}`);
      console.log('-----------------------------------------\n');
      return { success: true, messageId: 'dev-mode-log' };
    }
    console.error('❌ Failed to send approval email:', error.message);
    return { success: false, reason: error.message };
  }
};

/**
 * Send password reset email with reset link
 */
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const email = user.personalInfo?.email;
    if (!email) {
      return { success: false, reason: 'no_email' };
    }

    const fullName = `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim() || user.username;
    const baseUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== 'null'
      ? process.env.FRONTEND_URL
      : 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
    console.log(`🔗 Generated Reset URL: ${resetUrl}`);
    console.log(`📡 FRONTEND_URL from env: ${process.env.FRONTEND_URL}`);

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Ethiopia Vital Events System" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@vitalevents.gov.et'}>`,
      to: email,
      subject: '🔐 Password Reset Request',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding: 30px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">🔐 Password Reset</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${fullName}</strong>,</p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #dc3545; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                ⚠️ This link will expire in <strong>1 hour</strong>. If you did not request this, please ignore this email.
              </p>
            </div>
            <p style="font-size: 13px; color: #888; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #0d6efd; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          <div style="background: #e9ecef; padding: 15px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
              © ${new Date().getFullYear()} Ethiopia Vital Events System. All rights reserved.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    // Fallback for development if SMTP is not configured
    if (process.env.NODE_ENV === 'development') {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
      console.log('\n--- 📧 [DEVELOPMENT] PASSWORD RESET EMAIL ---');
      console.log(`To: ${user.personalInfo?.email}`);
      console.log(`Subject: 🔐 Password Reset Request`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log('---------------------------------------------\n');
      return { success: true, messageId: 'dev-mode-log' };
    }

    console.error('❌ Failed to send password reset email:', error.message);
    return { success: false, reason: error.message };
  }
};

/**
 * Send event approval notification email
 */
const sendEventApprovalEmail = async (user, event) => {
  try {
    const email = user.personalInfo?.email;
    if (!email) {
      console.log('⚠️ No email address found for citizen, skipping event email notification.');
      return { success: false, reason: 'no_email' };
    }

    const fullName = `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim() || user.username;
    const eventType = event.type.charAt(0).toUpperCase() + event.type.slice(1);
    const certNumber = event.certificate?.number || 'N/A';

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Ethiopia Vital Events System" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@vitalevents.gov.et'}>`,
      to: email,
      subject: `📜 ${eventType} Certificate Ready`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #198754, #157347); padding: 30px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px;">🇪🇹 Vital Event Approved</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Dear <strong>${fullName}</strong>,</p>
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              Your <strong>${eventType}</strong> registration has been officially approved.
            </p>
            <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #666;"><strong>Certificate Details:</strong></p>
              <p style="margin: 0; font-size: 15px; color: #333;">
                <strong>Type:</strong> ${eventType}<br>
                <strong>Certificate No:</strong> <span style="color: #198754; font-weight: bold;">${certNumber}</span><br>
                <strong>Issue Date:</strong> ${new Date().toLocaleDateString()}
              </p>
            </div>
            ${event.type === 'birth' && event.childAccountInfo ? `
            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; border: 1px solid #bee3f8; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #2c5282; font-weight: bold;">🍼 Child Account Created Automatically</p>
              <p style="margin: 0; font-size: 14px; color: #333;">
                An account has been created for your child <strong>${event.birthDetails?.childName || ''}</strong>.<br>
                Please save these login credentials in a safe place:
              </p>
              <div style="background: #fff; padding: 12px; border-radius: 6px; margin-top: 12px; border: 1px dashed #90cdf4;">
                <p style="margin: 0; font-size: 15px; color: #2d3748; font-family: monospace;">
                  <strong>Username:</strong> ${event.childAccountInfo.username}<br>
                  <strong>Password:</strong> ${event.childAccountInfo.initialPassword}
                </p>
              </div>
              <p style="margin: 10px 0 0; font-size: 12px; color: #718096; font-style: italic;">
                ⚠️ This password is the certificate number. Please log in and change it as soon as possible.
              </p>
            </div>
            ` : ''}
            <p style="font-size: 15px; color: #555; line-height: 1.6;">
              You can now download your digital certificate from your dashboard under <strong>"Other Certificates"</strong>.<br>
              Child account credentials are also visible in the <strong>"Registered Credentials"</strong> tab.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                 style="background: #198754; color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                View My Certificate
              </a>
            </div>
          </div>
          <div style="background: #e9ecef; padding: 15px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: #6c757d;">
               © ${new Date().getFullYear()} Ethiopia Vital Events System.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Event approval email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('\n--- 📧 [DEVELOPMENT] EVENT APPROVAL EMAIL ---');
      console.log(`To: ${user.personalInfo?.email}`);
      console.log(`Subject: 📜 ${event.type.toUpperCase()} Certificate Ready`);
      if (event.childAccountInfo) {
        console.log(`Child Username: ${event.childAccountInfo.username}`);
        console.log(`Child Password: ${event.childAccountInfo.initialPassword}`);
      }
      console.log('---------------------------------------------\n');
      return { success: true, messageId: 'dev-mode-log' };
    }
    console.error('❌ Failed to send event approval email:', error.message);
    return { success: false, reason: error.message };
  }
};

/**
 * Send welcome email after registration
 */
const sendWelcomeEmail = async (user) => {
  try {
    const email = user.personalInfo?.email;
    if (!email) {
      return { success: false, reason: 'no_email' };
    }

    const fullName = `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim() || user.username;
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Ethiopia Vital Events System" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'noreply@vitalevents.gov.et'}>`,
      to: email,
      subject: '🇪🇹 Welcome to Ethiopia Vital Events System',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
          <div style="background: #0d6efd; padding: 25px; text-align: center;">
            <h1 style="color: #fff; margin: 0;">Welcome!</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px;">Dear <strong>${fullName}</strong>,</p>
            <p style="color: #555; line-height: 1.6;">
              Thank you for registering with the <strong>Ethiopia Vital Events System</strong>.
            </p>
            <p style="color: #555; line-height: 1.6;">
              Your application is currently <strong>pending review</strong> by your local Kebele representative. 
              Once reviewed and approved by the Woreda office, you will receive another email and will be able to access all features.
            </p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>Username:</strong> ${user.username}<br>
                <strong>Status:</strong> Awaiting Review
              </p>
            </div>
            <p style="font-size: 14px; color: #888;">
              You will be notified once your account is active.
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0; font-size: 12px; color: #999;">
              This is an automated message, please do not reply.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('\n--- 📧 [DEVELOPMENT] WELCOME EMAIL ---');
      console.log(`To: ${user.personalInfo?.email}`);
      console.log('--------------------------------------\n');
      return { success: true, messageId: 'dev-mode-log' };
    }
    return { success: false, reason: error.message };
  }
};

module.exports = {
  sendApprovalEmail,
  sendPasswordResetEmail,
  sendEventApprovalEmail,
  sendWelcomeEmail
};
