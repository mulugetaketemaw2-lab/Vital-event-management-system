const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'citizen_registration',
      'event_submission',
      'citizen_approved',
      'citizen_rejected',
      'citizen_woreda_verification',
      'citizen_woreda_review',
      'citizen_woreda_decision',
      'citizen_verification',
      'event_forwarded_to_woreda',
      'new_citizen_registration',
      'event_forwarded',
      'event_completed',
      'system'
    ],
    required: true
  },
  category: {
    type: String,
    enum: ['success', 'pending', 'action_required', 'system'],
    default: 'pending'
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);