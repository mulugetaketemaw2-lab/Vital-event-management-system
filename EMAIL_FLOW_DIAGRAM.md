# 📊 Email Notification Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Vital Events System                          │
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   Frontend   │─────▶│   Backend    │─────▶│   Database   │ │
│  │  (React.js)  │      │  (Node.js)   │      │  (MongoDB)   │ │
│  └──────────────┘      └──────┬───────┘      └──────────────┘ │
│                               │                                 │
│                               │                                 │
│                               ▼                                 │
│                      ┌─────────────────┐                        │
│                      │  Email Service  │                        │
│                      │  (Nodemailer)   │                        │
│                      └────────┬────────┘                        │
└───────────────────────────────┼─────────────────────────────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │  Gmail SMTP   │
                        │  smtp.gmail   │
                        │  Port: 587    │
                        └───────┬───────┘
                                │
                                ▼
                        ┌───────────────┐
                        │  User's Email │
                        │   Inbox 📧    │
                        └───────────────┘
```

---

## User Registration Flow

```
User fills registration form
         │
         ▼
Frontend sends POST /api/auth/register
         │
         ▼
Backend creates user in database
         │
         ▼
Backend calls emailService.sendWelcomeEmail()
         │
         ▼
Email sent via Gmail SMTP
         │
         ▼
User receives welcome email 📧
```

---

## Event Approval Flow

```
Citizen submits birth event
         │
         ▼
Backend saves event (status: pending)
         │
         ▼
emailService.sendEventSubmitted()
         │
         ▼
Citizen receives confirmation email 📧
         │
         ▼
Administrator reviews event
         │
         ▼
Administrator approves event
         │
         ▼
Backend updates event (status: approved)
         │
         ▼
emailService.sendEventApproved()
         │
         ▼
Citizen receives approval email 📧
```

---

## Certificate Generation Flow

```
Event is approved
         │
         ▼
Administrator generates certificate
         │
         ▼
Backend creates PDF certificate
         │
         ▼
Backend saves certificate to database
         │
         ▼
emailService.sendCertificateReady()
         │
         ▼
Citizen receives notification 📧
         │
         ▼
Citizen logs in and downloads certificate
```

---

## Password Reset Flow

```
User clicks "Forgot Password"
         │
         ▼
Frontend sends POST /api/auth/forgot-password
         │
         ▼
Backend generates reset token
         │
         ▼
Backend saves token to user record
         │
         ▼
emailService.sendPasswordReset(token)
         │
         ▼
User receives email with reset link 📧
         │
         ▼
User clicks link in email
         │
         ▼
Frontend opens reset password page
         │
         ▼
User enters new password
         │
         ▼
Backend validates token and updates password
```

---

## Email Service Internal Flow

```
Controller calls emailService.sendXXX()
         │
         ▼
Email service selects template
         │
         ▼
Template generates HTML + Text content
         │
         ▼
Nodemailer creates email message
         │
         ▼
Connect to Gmail SMTP (smtp.gmail.com:587)
         │
         ▼
Authenticate with App Password
         │
         ▼
Send email via SMTP
         │
         ▼
Gmail delivers to recipient
         │
         ▼
Return success/failure to controller
```

---

## Error Handling Flow

```
Email sending fails
         │
         ▼
Error logged to console
         │
         ▼
Return { success: false, error: message }
         │
         ▼
Controller continues (doesn't crash)
         │
         ▼
User operation completes successfully
         │
         ▼
(Email can be retried later or queued)
```

---

## Multi-User Notification Flow

```
Administrator approves 10 events
         │
         ▼
Loop through all events
         │
         ├─▶ Event 1 → Send email to Citizen 1 📧
         │
         ├─▶ Event 2 → Send email to Citizen 2 📧
         │
         ├─▶ Event 3 → Send email to Citizen 3 📧
         │
         └─▶ ... (continue for all events)
         │
         ▼
All notifications sent
```

---

## Email Template Selection

```
emailService.sendEventApproved(email, name, type, id)
         │
         ▼
Select template: 'eventApproved'
         │
         ▼
Template function receives parameters
         │
         ▼
Generate email content:
  ├─▶ Subject: "Event Approved - Vital Events System"
  ├─▶ Text version (plain text)
  └─▶ HTML version (styled)
         │
         ▼
Return email content object
         │
         ▼
Send via transporter
```

---

## Gmail SMTP Authentication

```
Application starts
         │
         ▼
Load .env configuration
         │
         ▼
Create nodemailer transporter
  ├─▶ host: smtp.gmail.com
  ├─▶ port: 587
  ├─▶ secure: false
  └─▶ auth: { user, pass }
         │
         ▼
Verify connection
         │
         ├─▶ Success: ✅ Email service ready
         │
         └─▶ Failure: ❌ Configuration error
```

---

## Daily Email Limit Management

```
Gmail Free Account: 500 emails/day
         │
         ▼
Track emails sent today
         │
         ├─▶ < 500: Send email ✅
         │
         └─▶ ≥ 500: Queue for tomorrow ⏰
                    or use alternative service
```

---

## Production Deployment Flow

```
Development Environment
  ├─▶ Gmail SMTP (500/day limit)
  └─▶ Test with personal emails
         │
         ▼
Production Environment
  ├─▶ Option 1: Gmail (for small scale)
  ├─▶ Option 2: SendGrid (100 free/day)
  ├─▶ Option 3: AWS SES (62k free/month)
  └─▶ Option 4: Mailgun (5k free/month)
         │
         ▼
Update .env with production credentials
         │
         ▼
Deploy and monitor email delivery
```

---

## Email Queue System (Optional)

```
High volume of emails needed
         │
         ▼
Add emails to queue
         │
         ▼
Queue processor starts
         │
         ▼
Process one email at a time
         │
         ├─▶ Send email
         ├─▶ Wait 1 second (rate limiting)
         └─▶ Next email
         │
         ▼
All emails processed
```

---

## Monitoring & Logging

```
Email sent
         │
         ├─▶ Success: Log message ID
         │            Console: ✅ Email sent
         │
         └─▶ Failure: Log error details
                      Console: ❌ Error sending email
         │
         ▼
Store in application logs
         │
         ▼
Monitor for patterns:
  ├─▶ High failure rate → Check credentials
  ├─▶ Slow delivery → Check SMTP connection
  └─▶ Spam reports → Review email content
```

---

## Integration Points

```
┌─────────────────────────────────────────────────────────┐
│                    Controllers                          │
├─────────────────────────────────────────────────────────┤
│  authController.js                                      │
│    ├─▶ register() → sendWelcomeEmail()                 │
│    ├─▶ approveUser() → sendRegistrationApproval()      │
│    └─▶ forgotPassword() → sendPasswordReset()          │
│                                                         │
│  vitalEventController.js                               │
│    ├─▶ createEvent() → sendEventSubmitted()            │
│    ├─▶ approveEvent() → sendEventApproved()            │
│    └─▶ rejectEvent() → sendEventRejected()             │
│                                                         │
│  certificateController.js                              │
│    └─▶ generateCertificate() → sendCertificateReady()  │
│                                                         │
│  representativeController.js                           │
│    └─▶ approveRep() → sendRegistrationApproval()       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  Email Service   │
              └──────────────────┘
```

---

## Email Template Structure

```
emailTemplates = {
  registrationApproval: (userName, role) => {
    subject: "Registration Approved"
    text: "Plain text version..."
    html: "<div>HTML version...</div>"
  },
  
  certificateReady: (userName, eventType, certId) => {
    subject: "Certificate Ready"
    text: "Plain text version..."
    html: "<div>HTML version...</div>"
  },
  
  // ... 7 total templates
}
```

---

## Complete User Journey Example

```
1. User Registration
   └─▶ 📧 Welcome Email

2. Admin Approval
   └─▶ 📧 Registration Approved Email

3. User Submits Birth Event
   └─▶ 📧 Event Submitted Email

4. Admin Reviews Event
   └─▶ 📧 Event Approved Email

5. Admin Generates Certificate
   └─▶ 📧 Certificate Ready Email

6. User Downloads Certificate
   └─▶ ✅ Process Complete
```

---

## Security Flow

```
Gmail Account
         │
         ▼
Enable 2-Step Verification
         │
         ▼
Generate App Password
         │
         ▼
Store in .env file (not in code)
         │
         ▼
.env added to .gitignore
         │
         ▼
Credentials never committed to Git
         │
         ▼
Production uses environment variables
         │
         ▼
Secure email sending ✅
```

---

This diagram shows the complete flow of email notifications in your Vital Events System!
