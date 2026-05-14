const mongoose = require('mongoose');

const vitalEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['birth', 'death', 'marriage', 'divorce', 'adoption'],
    required: true
  },
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    region: String,
    regionCode: String,
    zone: String,
    zoneCode: String,
    woreda: String,
    woredaCode: String,
    kebele: String,
    kebeleCode: String
  },
  // Documents
  idCard: {
    url: String,
    originalName: String,
    mimeType: String,
    size: Number
  },
  documents: [{
    url: String,
    originalName: String,
    mimeType: String,
    size: Number,
    filename: String
  }],
  // Common fields for all event types
  registrationDate: {
    type: Date,
    default: Date.now
  },
  eventDate: Date,

  // Birth specific fields (enhanced)
  birthDetails: {
    childName: String,
    gender: String,
    weight: Number,
    placeOfBirth: String,
    // Parent information
    fatherName: String,
    motherName: String,
    fatherNationality: String,
    motherNationality: String,
    fatherOccupation: String,
    motherOccupation: String,
    fatherEducation: String,
    motherEducation: String,
    fatherAge: Number,
    motherAge: Number,
    // Photos
    childPhoto: {
      url: String,
      filename: String
    },
    parentPhotos: {
      father: { url: String, filename: String },
      mother: { url: String, filename: String }
    },
    // Additional information
    birthCertificateNumber: String,
    hospitalName: String,
    doctorName: String,
    birthType: {
      type: String,
      enum: ['normal', 'caesarean', 'home', 'other']
    },
    numberOfChildren: Number,
    birthOrder: Number,
    child_national_id: {
      type: String,
      default: null
    },
    is_temporary_id: {
      type: Boolean,
      default: false
    }
  },

  // Other event types...
  deathDetails: {
    deceasedName: String,
    gender: String,
    age: Number,
    causeOfDeath: String,
    placeOfDeath: String,
    informantName: String,
    informantRelationship: String,
    deceasedPhoto: {
      url: String,
      filename: String
    }
  },

  marriageDetails: {
    husbandName: String,
    husbandNationalId: String,
    wifeName: String,
    wifeNationalId: String,
    husbandAge: Number,
    wifeAge: Number,
    marriageType: String,
    witness1: String,
    witness2: String,
    husbandPhoto: {
      url: String,
      filename: String
    },
    wifePhoto: {
      url: String,
      filename: String
    }
  },

  status: {
    type: String,
    enum: ['pending', 'pending_woreda', 'pending_zone', 'pending_region', 'pending_national', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  currentLevel: {
    type: String,
    enum: ['kebele', 'woreda', 'zone', 'region', 'national', 'completed'],
    default: 'kebele' // Always starts at kebele
  },
  verification: [{
    level: String,
    representative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: String,
    comments: String,
    officerName: String,
    seal: {
      url: String,
      filename: String
    },
    signature: {
      url: String,
      filename: String
    },
    verifiedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Birth certificate fields
  certificate: {
    number: String,
    issueDate: Date,
    downloadUrl: String,
    qrCode: String,
    authorizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid'],
      default: 'unpaid'
    },
    paymentReference: String,
    paymentAmount: Number,
    paymentInitiatedAt: Date,
    paidAt: Date,
    paymentVerified: Boolean
  },
  registeredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Stores the initial plain-text credentials for child account (shown once to parent)
  childAccountInfo: {
    username: String,
    initialPassword: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VitalEvent', vitalEventSchema);