# ⚡ Quick Start: Email Setup in 5 Minutes

Follow these steps to get email notifications working right now.

---

## Step 1: Create Gmail Account (2 minutes)

1. Go to https://accounts.google.com/signup
2. Create account: `vitalregistrationsystem@gmail.com` (or your preferred name)
3. Complete the signup process

---

## Step 2: Enable 2FA & Get App Password (2 minutes)

1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification" → Enable it
3. After enabling, go back to Security
4. Click "App passwords"
5. Select "Mail" and "Other" → Name it "Vital Events"
6. Click "Generate"
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

---

## Step 3: Update .env File (30 seconds)

Open `backend/.env` and update these lines:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=vitalregistrationsystem@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
```

Replace with your actual Gmail and App Password.

---

## Step 4: Test It (30 seconds)

Run the test script:

```bash
cd backend
node test-email.js
```

You should see:
```
✅ Email sent successfully
```

Check your inbox at the test email address!

---

## Step 5: Use in Your Code (1 minute)

Add to any controller:

```javascript
const emailService = require('../services/emailService');

// Send welcome email
await emailService.sendWelcomeEmail(
  'user@example.com',
  'User Name',
  'Citizen'
);
```

---

## 🎉 Done!

Your email system is now ready. Check the full guides for more details:

- `EMAIL_SETUP_GUIDE.md` - Complete setup instructions
- `INTEGRATION_EXAMPLES.md` - How to use in your controllers
- `backend/services/emailService.js` - The email service code

---

## 🆘 Quick Troubleshooting

**Problem:** "Invalid login"  
**Fix:** Use App Password, not regular Gmail password

**Problem:** "Connection timeout"  
**Fix:** Check internet connection and firewall

**Problem:** Emails not arriving  
**Fix:** Check spam folder

---

## 📧 Available Email Types

```javascript
// 1. Welcome email
emailService.sendWelcomeEmail(email, name, role)

// 2. Registration approval
emailService.sendRegistrationApproval(email, name, role)

// 3. Event submitted
emailService.sendEventSubmitted(email, name, eventType, eventId)

// 4. Event approved
emailService.sendEventApproved(email, name, eventType, eventId)

// 5. Event rejected
emailService.sendEventRejected(email, name, eventType, eventId, reason)

// 6. Certificate ready
emailService.sendCertificateReady(email, name, eventType, certId)

// 7. Password reset
emailService.sendPasswordReset(email, name, resetToken)

// 8. Custom email
emailService.sendCustomEmail(email, subject, text, html)
```

---

**That's it! You're ready to send emails.** 🚀
