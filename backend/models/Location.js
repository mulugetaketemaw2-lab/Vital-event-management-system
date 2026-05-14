const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['region', 'zone', 'woreda', 'kebele'],
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  },
  code: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Location', locationSchema);