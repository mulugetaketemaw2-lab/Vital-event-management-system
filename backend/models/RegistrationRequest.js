const mongoose = require('mongoose');

const registrationRequestSchema = new mongoose.Schema({
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  kebeleRepresentative: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  location: {
    region: String,
    zone: String,
    woreda: String,
    kebele: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'verified'],
    default: 'pending'
  },
  reviewComments: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  documents: [{
    type: String,
    url: String,
    filename: String
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('RegistrationRequest', registrationRequestSchema);