# 📧 Email Notification System Setup Guide

## Overview
This guide will help you set up a complete email notification system for the Vital Events Recording System using Gmail SMTP.

---

## 🎯 Step 1: Create a Gmail Account

Create a dedicated email account for your system:

**Example:** `vitalregistrationsystem@gmail.com`

This email will be used to send:
- Registration approval notifications
- Certificate ready notifications
- Password reset links
- Event status updates
- Welcome emails

---

## 🔐 Step 2: Enable 2-Step Verification

1. Go to [Google Account Security Settings](https://myaccount.google.com/security)
2. Find "2-Step Verification" section
3. Click "Get Started" and follow the setup process
4. Complete the verification using your phone

**Why?** Gmail requires 2-Step Verification before you can generate App Passwords.

---

## 🔑 Step 3: Generate Gmail App Password

After enabling 2FA:

1. Go to [Google Account](https://myaccount.google.com/)
2. Navigate to **Security** → **2-Step Verification**
3. Scroll down to **App passwords**
4. Click "Generate" and select:
   - App: Mail
   - Device: Other (Custom name) → "Vital Events System"
5. Click "Generate"

You'll receive a 16-character password like:
```
abct fghi jklm nopq
```

⚠️ **IMPORTANT:** Save this password immediately! You won't be able to see it again.

---

## ⚙️ Step 4: Configure Backend Environment

Update your `backend/.env` file with the Gmail SMTP settings:

```env
# Email SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vitalregistrationsystem@gmail.com
SMTP_PASS=abct fghi jklm nopq

# Frontend URL (for password reset links)
FRONTEND_URL=http://localhost:3000
```

**Replace:**
- `SMTP_USER` with your Gmail address
- `SMTP_PASS` with the App Password you generated

---

## 📝 Step 5: Email Service Usage

The email service is already created at `backend/services/emailService.js`

### Available Email Functions:

```javascript
const emailService = require('./services/emailService');

// 1. Registration Approval
await emailService.sendRegistrationApproval(
  'user@example.com',
  'Abubeker',
  'Kebele Administrator'
);

// 2. Certificate Ready
await emailService.sendCertificateReady(
  'user@example.com',
  'Abubeker',
  'Birth',
  'CERT-2024-001'
);

// 3. Password Reset
await emailService.sendPasswordReset(
  'user@example.com',
  'Abubeker',
  'reset-token-here'
);

// 4. Event Submitted
await emailService.sendEventSubmitted(
  'user@example.com',
  'Abubeker',
  'Birth',
  'EVT-2024-001'
);

// 5. Event Approved
await emailService.sendEventApproved(
  'user@example.com',
  'Abubeker',
  'Birth',
  'EVT-2024-001'
);

// 6. Event Rejected
await emailService.sendEventRejected(
  'user@example.com',
  'Abubeker',
  'Birth',
  'EVT-2024-001',
  'Missing required documents'
);

// 7. Welcome Email
await emailService.sendWelcomeEmail(
  'user@example.com',
  'Abubeker',
  'Citizen'
);

// 8. Custom Email
await emailService.sendCustomEmail(
  'user@example.com',
  'Custom Subject',
  'Plain text content',
  '<h1>HTML content</h1>'
);
```

---

## 🔧 Step 6: Integration Examples

### Example 1: Send Email on User Registration

```javascript
// In authController.js
const emailService = require('../services/emailService');

// After user registration
const newUser = await User.create({
  name: req.body.name,
  email: req.body.email,
  // ... other fields
});

// Send welcome email
await emailService.sendWelcomeEmail(
  newUser.email,
  newUser.name,
  newUser.role
);
```

### Example 2: Send Email on Event Approval

```javascript
// In vitalEventController.js
const emailService = require('../services/emailService');

// After approving an event
event.status = 'approved';
await event.save();

// Send approval email
await emailService.sendEventApproved(
  event.citizenId.email,
  event.citizenId.name,
  event.eventType,
  event._id
);
```

### Example 3: Send Email on Certificate Generation

```javascript
// In certificateController.js
const emailService = require('../services/emailService');

// After generating certificate
const certificate = await Certificate.create({
  eventId: event._id,
  // ... other fields
});

// Send certificate ready email
await emailService.sendCertificateReady(
  event.citizenId.email,
  event.citizenId.name,
  event.eventType,
  certificate._id
);
```

---

## 🧪 Step 7: Test the Email Service

Create a test file to verify email sending:

```javascript
// backend/test-email.js
require('dotenv').config();
const emailService = require('./services/emailService');

async function testEmail() {
  console.log('Testing email service...');
  
  const result = await emailService.sendWelcomeEmail(
    'firdosmahmud07@gmail.com', // Replace with your test email
    'Test User',
    'Citizen'
  );
  
  console.log('Result:', result);
}

testEmail();
```

Run the test:
```bash
node backend/test-email.js
```

---

## 📊 Email Templates Included

The system includes 7 pre-designed email templates:

1. **Registration Approval** - Notifies users when their registration is approved
2. **Certificate Ready** - Alerts users when their certificate is ready for download
3. **Password Reset** - Sends password reset link with token
4. **Event Submitted** - Confirms event submission
5. **Event Approved** - Notifies when event is approved
6. **Event Rejected** - Explains why event was rejected
7. **Welcome Email** - Greets new users

All templates include both plain text and HTML versions for better compatibility.

---

## 🔍 Troubleshooting

### Issue: "Invalid login" error
**Solution:** Make sure you're using the App Password, not your regular Gmail password.

### Issue: "Connection timeout"
**Solution:** Check your firewall settings. Port 587 must be open for outgoing connections.

### Issue: "Email not configured" warning
**Solution:** Verify that `SMTP_USER` and `SMTP_PASS` are set in your `.env` file.

### Issue: Emails going to spam
**Solution:** 
- Add SPF and DKIM records to your domain (if using custom domain)
- Ask recipients to mark your emails as "Not Spam"
- Avoid spam trigger words in subject lines

---

## 🌐 Production Considerations

### For Production Deployment:

1. **Use a Professional Email Service:**
   - Consider using SendGrid, AWS SES, or Mailgun for better deliverability
   - Gmail has daily sending limits (500 emails/day for free accounts)

2. **Environment Variables:**
   - Never commit `.env` file to version control
   - Use secure environment variable management in production

3. **Error Handling:**
   - The email service logs errors but doesn't crash the application
   - Monitor email sending failures in production logs

4. **Rate Limiting:**
   - Implement rate limiting to avoid hitting Gmail's sending limits
   - Queue emails for batch processing if needed

---

## 📧 Gmail Sending Limits

- **Free Gmail Account:** 500 emails per day
- **Google Workspace:** 2,000 emails per day

If you need to send more emails, consider:
- SendGrid (100 emails/day free, then paid plans)
- AWS SES (62,000 emails/month free for first year)
- Mailgun (5,000 emails/month free)

---

## ✅ Checklist

- [ ] Created dedicated Gmail account
- [ ] Enabled 2-Step Verification
- [ ] Generated App Password
- [ ] Updated `.env` file with SMTP credentials
- [ ] Tested email sending with test script
- [ ] Integrated email service into controllers
- [ ] Verified emails are being received
- [ ] Checked spam folder if emails not appearing

---

## 📞 Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify your Gmail App Password is correct
3. Ensure 2FA is enabled on your Gmail account
4. Test with the provided test script first

---

**Created:** March 2024  
**System:** Vital Events Recording System  
**Email Service:** Gmail SMTP with Nodemailer
