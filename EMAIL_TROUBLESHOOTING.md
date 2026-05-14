# 🔧 Email System Troubleshooting Guide

Common issues and their solutions for the email notification system.

---

## ❌ Problem 1: "Invalid login: 535-5.7.8 Username and Password not accepted"

### Cause:
- Using regular Gmail password instead of App Password
- App Password not generated correctly
- 2-Step Verification not enabled

### Solution:
1. Go to https://myaccount.google.com/security
2. Verify 2-Step Verification is ON
3. Go to "App passwords"
4. Generate a NEW App Password
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)
6. Update `.env` file:
   ```env
   SMTP_PASS=abcd efgh ijkl mnop
   ```
7. Restart your server

---

## ❌ Problem 2: "Connection timeout" or "ETIMEDOUT"

### Cause:
- Firewall blocking port 587
- No internet connection
- Corporate network restrictions

### Solution:
1. Check internet connection
2. Try alternative port in `.env`:
   ```env
   SMTP_PORT=465
   SMTP_SECURE=true
   ```
3. Check firewall settings (allow outgoing port 587 or 465)
4. If on corporate network, ask IT to allow SMTP connections
5. Test connection:
   ```bash
   telnet smtp.gmail.com 587
   ```

---

## ❌ Problem 3: "Email service not configured" warning

### Cause:
- Missing SMTP credentials in `.env` file
- `.env` file not loaded properly

### Solution:
1. Verify `.env` file exists in `backend/` folder
2. Check these variables are set:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   ```
3. Ensure `dotenv` is loaded in your main file:
   ```javascript
   require('dotenv').config();
   ```
4. Restart your server

---

## ❌ Problem 4: Emails going to spam folder

### Cause:
- New Gmail account with low reputation
- Email content triggers spam filters
- Missing SPF/DKIM records (for custom domains)

### Solution:
1. Ask recipients to mark your emails as "Not Spam"
2. Avoid spam trigger words in subject lines:
   - "Free", "Winner", "Click here", "Act now"
3. Use professional email content
4. For custom domains, add SPF record:
   ```
   v=spf1 include:_spf.google.com ~all
   ```
5. Warm up your email account (send gradually increasing volumes)

---

## ❌ Problem 5: "Daily sending quota exceeded"

### Cause:
- Gmail free account limit: 500 emails/day
- Google Workspace limit: 2,000 emails/day

### Solution:
1. Implement email queue to spread sending over time
2. Upgrade to Google Workspace for higher limits
3. Use alternative email service:
   - SendGrid: 100 free/day, then paid
   - AWS SES: 62,000 free/month (first year)
   - Mailgun: 5,000 free/month
4. Implement rate limiting in your code

---

## ❌ Problem 6: Emails not arriving at all

### Cause:
- Wrong recipient email address
- Email blocked by recipient's server
- Gmail account suspended

### Solution:
1. Verify recipient email is correct
2. Check Gmail account status at https://mail.google.com
3. Look for bounce-back emails in your Gmail inbox
4. Test with different email providers:
   - Gmail
   - Yahoo
   - Outlook
   - Custom domain
5. Check application logs for error messages

---

## ❌ Problem 7: "Error: self signed certificate in certificate chain"

### Cause:
- SSL/TLS certificate validation issue
- Corporate proxy interfering

### Solution:
1. Update transporter configuration:
   ```javascript
   const transporter = nodemailer.createTransport({
     host: 'smtp.gmail.com',
     port: 587,
     secure: false,
     auth: { user, pass },
     tls: {
       rejectUnauthorized: false  // Add this line
     }
   });
   ```
2. Only use in development, not production

---

## ❌ Problem 8: Slow email sending

### Cause:
- Network latency
- Gmail rate limiting
- Sending too many emails at once

### Solution:
1. Implement email queue with delays:
   ```javascript
   for (const email of emails) {
     await sendEmail(email);
     await new Promise(r => setTimeout(r, 1000)); // 1 second delay
   }
   ```
2. Use background job processor (Bull, Agenda)
3. Send emails asynchronously without blocking main operations

---

## ❌ Problem 9: "Module not found: nodemailer"

### Cause:
- nodemailer not installed
- Wrong directory

### Solution:
1. Install nodemailer:
   ```bash
   cd backend
   npm install nodemailer
   ```
2. Verify in `package.json`:
   ```json
   "dependencies": {
     "nodemailer": "^8.0.1"
   }
   ```

---

## ❌ Problem 10: HTML emails not rendering properly

### Cause:
- Email client doesn't support certain HTML/CSS
- Missing inline styles

### Solution:
1. Use inline CSS (already done in templates)
2. Test with multiple email clients
3. Keep HTML simple and table-based
4. Avoid:
   - External CSS files
   - JavaScript
   - Complex layouts
   - Background images

---

## ❌ Problem 11: Password reset link not working

### Cause:
- Token expired (1 hour limit)
- Wrong frontend URL in `.env`
- Token not properly encoded

### Solution:
1. Check `FRONTEND_URL` in `.env`:
   ```env
   FRONTEND_URL=http://localhost:3000
   ```
2. Verify token expiration logic
3. Test the complete flow:
   ```javascript
   // Generate token
   const token = crypto.randomBytes(32).toString('hex');
   
   // Send email with link
   const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
   ```

---

## ❌ Problem 12: "Cannot read property 'email' of undefined"

### Cause:
- User/citizen data not populated
- Missing email field in database

### Solution:
1. Populate user data before sending email:
   ```javascript
   const event = await VitalEvent.findById(id)
     .populate('citizenId', 'name email');
   
   if (!event.citizenId.email) {
     console.log('User has no email address');
     return;
   }
   ```
2. Add email validation in user schema:
   ```javascript
   email: {
     type: String,
     required: true,
     validate: {
       validator: (v) => /\S+@\S+\.\S+/.test(v)
     }
   }
   ```

---

## ❌ Problem 13: Test script fails with "Cannot find module"

### Cause:
- Running from wrong directory
- Missing dependencies

### Solution:
1. Run from backend directory:
   ```bash
   cd backend
   node test-email.js
   ```
2. Ensure all dependencies installed:
   ```bash
   npm install
   ```

---

## 🔍 Debugging Checklist

Use this checklist to diagnose email issues:

```
□ Is .env file in the correct location (backend/.env)?
□ Are SMTP_USER and SMTP_PASS set correctly?
□ Is SMTP_PASS an App Password (not regular password)?
□ Is 2-Step Verification enabled on Gmail?
□ Is the server restarted after .env changes?
□ Is port 587 open for outgoing connections?
□ Is internet connection working?
□ Are there any error messages in console?
□ Is nodemailer installed (check package.json)?
□ Is the recipient email address valid?
□ Have you checked the spam folder?
□ Is the Gmail account active (not suspended)?
□ Are you within daily sending limits?
```

---

## 🧪 Testing Commands

### Test 1: Check .env configuration
```bash
cd backend
node -e "require('dotenv').config(); console.log('SMTP_USER:', process.env.SMTP_USER); console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***SET***' : 'NOT SET');"
```

### Test 2: Test SMTP connection
```bash
cd backend
node -e "const nodemailer = require('nodemailer'); const t = nodemailer.createTransport({host:'smtp.gmail.com',port:587,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}); t.verify().then(()=>console.log('✅ Connected')).catch(e=>console.log('❌',e.message));"
```

### Test 3: Send test email
```bash
cd backend
node test-email.js
```

### Test 4: Check if nodemailer is installed
```bash
cd backend
npm list nodemailer
```

---

## 📊 Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 535-5.7.8 | Invalid credentials | Use App Password |
| ETIMEDOUT | Connection timeout | Check firewall/network |
| ECONNREFUSED | Connection refused | Check SMTP host/port |
| 550 | Mailbox unavailable | Verify recipient email |
| 552 | Mailbox full | Recipient's inbox full |
| 554 | Transaction failed | Check email content |

---

## 🔐 Security Checklist

```
□ App Password used (not regular password)
□ .env file in .gitignore
□ Credentials not hardcoded in source files
□ HTTPS used in production
□ Email content sanitized (no XSS)
□ Rate limiting implemented
□ Error messages don't expose sensitive info
□ Production uses environment variables
```

---

## 📞 Getting Help

If you're still stuck:

1. Check console logs for detailed error messages
2. Enable debug mode:
   ```javascript
   const transporter = nodemailer.createTransport({
     // ... config
     debug: true,
     logger: true
   });
   ```
3. Test with a simple script first
4. Verify Gmail account is working (send email manually)
5. Try with a different Gmail account
6. Check Gmail's help center: https://support.google.com/mail

---

## 🎯 Quick Fixes Summary

| Problem | Quick Fix |
|---------|-----------|
| Invalid login | Use App Password, not regular password |
| Connection timeout | Check firewall, try port 465 |
| Not configured | Add SMTP credentials to .env |
| Going to spam | Ask recipients to mark as "Not Spam" |
| Quota exceeded | Use alternative service or queue |
| Not arriving | Check recipient email, test with different provider |
| Slow sending | Add delays between emails |
| Module not found | Run `npm install nodemailer` |

---

**Remember:** Most email issues are related to authentication (App Password) or network connectivity. Start there!
