const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: String,
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly']
  },
  period: {
    startDate: Date,
    endDate: Date
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sentTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  content: mongoose.Schema.Types.Mixed,
  status: {
    type: String,
    enum: ['draft', 'sent'],
    default: 'draft'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);