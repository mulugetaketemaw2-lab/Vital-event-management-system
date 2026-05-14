# 🔌 Email Service Integration Examples

This document shows how to integrate the email service into your existing controllers.

---

## 1. Authentication Controller Integration

### File: `backend/controllers/authController.js`

```javascript
const emailService = require('../services/emailService');

// After user registration
exports.register = async (req, res) => {
  try {
    // ... existing registration code ...
    
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      role: req.body.role
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(
      newUser.email,
      newUser.name,
      newUser.role
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Check your email for confirmation.',
      user: newUser
    });
  } catch (error) {
    // ... error handling ...
  }
};

// Approve user registration (for admin)
exports.approveRegistration = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    user.isApproved = true;
    await user.save();

    // Send approval email
    await emailService.sendRegistrationApproval(
      user.email,
      user.name,
      user.role
    );

    res.status(200).json({
      success: true,
      message: 'User approved and notified via email'
    });
  } catch (error) {
    // ... error handling ...
  }
};

// Password reset request
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send password reset email
    await emailService.sendPasswordReset(
      user.email,
      user.name,
      resetToken
    );

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## 2. Vital Event Controller Integration

### File: `backend/controllers/vitalEventController.js`

```javascript
const emailService = require('../services/emailService');

// Submit new event
exports.createEvent = async (req, res) => {
  try {
    // ... existing event creation code ...
    
    const newEvent = await VitalEvent.create({
      citizenId: req.body.citizenId,
      eventType: req.body.eventType,
      status: 'pending',
      // ... other fields ...
    });

    // Populate citizen data
    await newEvent.populate('citizenId', 'name email');

    // Send submission confirmation email
    await emailService.sendEventSubmitted(
      newEvent.citizenId.email,
      newEvent.citizenId.name,
      newEvent.eventType,
      newEvent._id
    );

    res.status(201).json({
      success: true,
      message: 'Event submitted successfully. You will be notified via email.',
      event: newEvent
    });
  } catch (error) {
    // ... error handling ...
  }
};

// Approve event
exports.approveEvent = async (req, res) => {
  try {
    const event = await VitalEvent.findById(req.params.eventId)
      .populate('citizenId', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event.status = 'approved';
    event.approvedBy = req.user._id;
    event.approvedAt = Date.now();
    await event.save();

    // Send approval email
    await emailService.sendEventApproved(
      event.citizenId.email,
      event.citizenId.name,
      event.eventType,
      event._id
    );

    res.status(200).json({
      success: true,
      message: 'Event approved and citizen notified via email',
      event
    });
  } catch (error) {
    // ... error handling ...
  }
};

// Reject event
exports.rejectEvent = async (req, res) => {
  try {
    const event = await VitalEvent.findById(req.params.eventId)
      .populate('citizenId', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event.status = 'rejected';
    event.rejectionReason = req.body.reason;
    event.rejectedBy = req.user._id;
    event.rejectedAt = Date.now();
    await event.save();

    // Send rejection email with reason
    await emailService.sendEventRejected(
      event.citizenId.email,
      event.citizenId.name,
      event.eventType,
      event._id,
      req.body.reason || 'Please contact your local office for details'
    );

    res.status(200).json({
      success: true,
      message: 'Event rejected and citizen notified via email',
      event
    });
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## 3. Certificate Controller Integration

### File: `backend/controllers/certificateController.js`

```javascript
const emailService = require('../services/emailService');

// Generate certificate
exports.generateCertificate = async (req, res) => {
  try {
    const event = await VitalEvent.findById(req.params.eventId)
      .populate('citizenId', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Event must be approved before generating certificate'
      });
    }

    // ... existing certificate generation code ...
    
    const certificate = await Certificate.create({
      eventId: event._id,
      certificateNumber: generateCertificateNumber(),
      issuedDate: Date.now(),
      // ... other fields ...
    });

    // Send certificate ready email
    await emailService.sendCertificateReady(
      event.citizenId.email,
      event.citizenId.name,
      event.eventType,
      certificate.certificateNumber
    );

    res.status(201).json({
      success: true,
      message: 'Certificate generated. Notification sent via email.',
      certificate
    });
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## 4. Representative Controller Integration

### File: `backend/controllers/representativeController.js`

```javascript
const emailService = require('../services/emailService');

// Approve representative
exports.approveRepresentative = async (req, res) => {
  try {
    const representative = await Representative.findById(req.params.repId)
      .populate('userId', 'name email');

    if (!representative) {
      return res.status(404).json({
        success: false,
        message: 'Representative not found'
      });
    }

    representative.isApproved = true;
    representative.approvedBy = req.user._id;
    representative.approvedAt = Date.now();
    await representative.save();

    // Send approval email
    await emailService.sendRegistrationApproval(
      representative.userId.email,
      representative.userId.name,
      'Representative'
    );

    res.status(200).json({
      success: true,
      message: 'Representative approved and notified',
      representative
    });
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## 5. Batch Email Sending (for Reports)

### File: `backend/controllers/reportController.js`

```javascript
const emailService = require('../services/emailService');

// Send monthly report to all administrators
exports.sendMonthlyReport = async (req, res) => {
  try {
    const admins = await User.find({ 
      role: { $in: ['national', 'regional', 'zone', 'woreda', 'kebele'] },
      isApproved: true 
    });

    const reportData = await generateMonthlyReport(); // Your report generation logic

    // Send emails to all admins
    const emailPromises = admins.map(admin => 
      emailService.sendCustomEmail(
        admin.email,
        'Monthly Vital Events Report',
        `Dear ${admin.name},\n\nPlease find attached the monthly report...`,
        `<h2>Monthly Report</h2><p>Dear ${admin.name},</p><p>Report data...</p>`
      )
    );

    await Promise.all(emailPromises);

    res.status(200).json({
      success: true,
      message: `Monthly report sent to ${admins.length} administrators`
    });
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## 6. Error Handling Best Practices

```javascript
// Wrap email sending in try-catch to prevent blocking main operations
exports.someController = async (req, res) => {
  try {
    // Main operation (e.g., save to database)
    const result = await SomeModel.create(data);

    // Send email (non-blocking)
    try {
      await emailService.sendSomeEmail(user.email, user.name);
    } catch (emailError) {
      // Log email error but don't fail the main operation
      console.error('Failed to send email:', emailError);
      // Optionally: Queue for retry or notify admin
    }

    // Return success even if email fails
    res.status(200).json({
      success: true,
      message: 'Operation completed successfully',
      result
    });
  } catch (error) {
    // Handle main operation errors
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

---

## 7. Queue System for High Volume (Optional)

For production systems with high email volume, consider using a queue:

```javascript
// backend/services/emailQueue.js
const emailService = require('./emailService');

class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  add(emailData) {
    this.queue.push(emailData);
    if (!this.processing) {
      this.process();
    }
  }

  async process() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const emailData = this.queue.shift();
      
      try {
        await emailService[emailData.method](...emailData.args);
        // Wait 1 second between emails to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Email queue error:', error);
        // Optionally: retry or move to dead letter queue
      }
    }
    
    this.processing = false;
  }
}

const emailQueue = new EmailQueue();

// Usage:
emailQueue.add({
  method: 'sendWelcomeEmail',
  args: [user.email, user.name, user.role]
});
```

---

## 8. Testing Integration

```javascript
// backend/test-integration.js
require('dotenv').config();
const mongoose = require('mongoose');
const emailService = require('./services/emailService');
const User = require('./models/User');

async function testIntegration() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Find a test user
  const user = await User.findOne({ email: 'test@example.com' });
  
  if (user) {
    await emailService.sendWelcomeEmail(user.email, user.name, user.role);
    console.log('✅ Integration test successful');
  }
  
  await mongoose.disconnect();
}

testIntegration();
```

---

## 📝 Quick Reference

| Event | Function | Parameters |
|-------|----------|------------|
| User registers | `sendWelcomeEmail` | email, name, role |
| Registration approved | `sendRegistrationApproval` | email, name, role |
| Event submitted | `sendEventSubmitted` | email, name, eventType, eventId |
| Event approved | `sendEventApproved` | email, name, eventType, eventId |
| Event rejected | `sendEventRejected` | email, name, eventType, eventId, reason |
| Certificate ready | `sendCertificateReady` | email, name, eventType, certificateId |
| Password reset | `sendPasswordReset` | email, name, resetToken |
| Custom email | `sendCustomEmail` | email, subject, text, html |

---

## ✅ Integration Checklist

- [ ] Import emailService in controllers
- [ ] Add email sending after user registration
- [ ] Add email sending after registration approval
- [ ] Add email sending after event submission
- [ ] Add email sending after event approval/rejection
- [ ] Add email sending after certificate generation
- [ ] Add email sending for password reset
- [ ] Implement error handling for email failures
- [ ] Test all email integrations
- [ ] Monitor email sending in production logs

---

**Note:** All email sending is asynchronous and won't block your main application flow. Errors in email sending are logged but won't crash your application.
