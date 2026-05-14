const mongoose = require('mongoose');

const reportTransmissionSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true
  },
  reportType: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'quarterly']
  },
  reportLevel: {
    type: String,
    required: true,
    enum: ['kebele', 'woreda', 'zone', 'region', 'national']
  },
  fromLevel: {
    type: String,
    required: true,
    enum: ['kebele', 'woreda', 'zone', 'region']
  },
  toLevel: {
    type: String,
    required: true,
    enum: ['kebele', 'woreda', 'zone', 'region', 'national']
  },
  fromLocation: {
    type: Object,
    required: true
  },
  toLocation: {
    type: Object,
    required: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  period: {
    startDate: Date,
    endDate: Date
  },
  reportData: {
    citizens: {
      total: Number,
      approved: Number,
      rejected: Number,
      verified: Number,
      byWoreda: Object,
      byZone: Object
    },
    events: {
      total: Number,
      completed: Number,
      rejected: Number,
      byType: Object,
      byStatus: Object,
      byWoreda: Object,
      byZone: Object
    },
    stats: Object
  },
  status: {
    type: String,
    enum: ['sent', 'received', 'reviewed', 'archived'],
    default: 'sent'
  },
  transmittedAt: {
    type: Date,
    default: Date.now
  },
  receivedAt: Date,
  reviewedAt: Date,
  notes: String,
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String
  }]
}, {
  timestamps: true
});

// Index for efficient queries
reportTransmissionSchema.index({ toUser: 1, status: 1, transmittedAt: -1 });
reportTransmissionSchema.index({ toLevel: 1, toLocation: 1, status: 1 });
reportTransmissionSchema.index({ reportId: 1 });

module.exports = mongoose.model('ReportTransmission', reportTransmissionSchema);
