const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 5
  },
  role: {
    type: String,
    enum: ['citizen', 'kebele', 'woreda', 'zone', 'region', 'national'],
    required: true
  },
  personalInfo: {
    firstName: { type: String, required: function () { return this.role === 'citizen'; } },
    lastName: { type: String, required: function () { return this.role === 'citizen'; } },
    email: String,
    phone: String,
    idNumber: {
      type: String,
      maxlength: [16, 'National ID must be at most 16 digits']
    },
    dateOfBirth: Date,
    gender: String,
    nationality: String,
    // Photo upload field
    photo: {
      url: String,
      filename: String,
      uploadedAt: Date
    },
    // Enhanced citizen information
    specialInformation: String,
    maritalStatus: {
      type: String,
      enum: ['single', 'married', 'divorced', 'widowed']
    },
    occupation: String,
    educationLevel: {
      type: String,
      enum: ['none', 'primary', 'secondary', 'diploma', 'bachelor', 'masters', 'phd']
    },
    // Family information
    familyInfo: {
      fatherName: String,
      motherName: String,
      fatherOccupation: String,
      motherOccupation: String,
      fatherNationality: String,
      motherNationality: String,
      fatherEducation: String,
      motherEducation: String,
      fatherPhone: String,
      motherPhone: String,
      fatherID: String,
      motherID: String
    },
    // Address information
    address: {
      houseNumber: String,
      specificLocation: String
    }
  },
  location: {
    region: String,
    regionCode: String,
    regionName: String,
    zone: String,
    zoneCode: String,
    zoneName: String,
    woreda: String,
    woredaCode: String,
    woredaName: String,
    kebele: String,
    kebeleCode: String,
    kebeleName: String
  },
  officeInfo: {
    officeName: String,
    officePhone: String,
    officeAddress: String
  },
  status: {
    type: String,
    enum: ['pending', 'pending_woreda', 'pending_zone', 'pending_region', 'pending_national', 'approved', 'rejected', 'rejected_woreda', 'rejected_zone', 'rejected_region'],
    default: 'pending'
  },
  idVerified: {
    type: Boolean,
    default: false
  },
  reviewedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewComments: String,
  rejectedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationNotes: String,
  profilePhoto: {
    url: String,
    filename: String,
    originalName: String,
    uploadedAt: Date,
    verified: {
      type: Boolean,
      default: false
    }
  },
  idCard: {
    url: String,
    filename: String,
    originalName: String,
    uploadedAt: Date,
    verified: {
      type: Boolean,
      default: false
    }
  },
  documents: [
    {
      type: {
        type: String,
        default: 'document'
      },
      url: String,
      filename: String,
      originalName: String,
      uploadedAt: Date,
      verified: {
        type: Boolean,
        default: false
      }
    }
  ],
  familyMembers: {
    type: Array,
    default: []
  },
  kebeleVerification: {
    officerName: String,
    seal: {
      url: String,
      filename: String
    },
    signature: {
      url: String,
      filename: String
    },
    approvedAt: Date
  },
  woredaVerification: {
    officerName: String,
    seal: {
      url: String,
      filename: String
    },
    signature: {
      url: String,
      filename: String
    },
    idCard: {
      url: String,
      filename: String
    },
    documents: [{
      url: String,
      filename: String,
      type: String
    }],
    approvedAt: Date
  },
  certificatePayment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending'
    },
    transactionReference: String,
    paidAt: Date,
    amount: Number
  },
  residentIdVersion: {
    type: Number,
    default: 1
  },
  profileHistory: [{
    personalInfo: Object,
    location: Object,
    version: Number,
    updatedAt: { type: Date, default: Date.now },
    changedBy: String
  }],
  verificationHistory: [{
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    level: String,
    status: String,
    comments: String,
    verifiedAt: { type: Date, default: Date.now }
  }],
  isActive: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  createdBy: {  // FIXED: Added this field properly
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  activationToken: String,
  activationExpires: Date,
  updateRequest: {
    status: {
      type: String,
      enum: ['none', 'pending', 'kebele_approved', 'woreda_approved', 'zone_approved', 'region_approved', 'rejected'],
      default: 'none'
    },
    pendingDetails: Object, // Stores requested profile/document changes
    justification: String,
    requestedAt: Date,
    kebeleReview: {
      officerName: String,
      reviewedAt: Date,
      comments: String
    },
    woredaReview: {
      officerName: String,
      reviewedAt: Date,
      comments: String
    }
  },
  isChild: {
    type: Boolean,
    default: false
  },
  identityLinkage: {
    is_temporary_id: {
      type: Boolean,
      default: false
    },
    id_type: {
      type: String,
      enum: ['National ID', 'Parental Reference'],
      default: 'National ID'
    },
    reference_id: String, // Stores parent's National ID
    notification_cycle_count: {
      type: Number,
      default: 0
    },
    last_notification_date: Date,
    is_banned: {
      type: Boolean,
      default: false
    }
  },
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true,
  strictPopulate: false  // Added to fix populate error
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Auto-activate citizens only
userSchema.pre('save', function (next) {
  if (this.role === 'citizen') {
    // Keep approval controlled by the review process.
    // Citizen activity should reflect approval state.
    this.isActive = !!this.isApproved;
  }
  next();
});

userSchema.index(
  { 'personalInfo.idNumber': 1 },
  { unique: true, partialFilterExpression: { 'personalInfo.idNumber': { $type: 'string', $ne: '' } } }
);

// High-speed search indexes for registrants
userSchema.index({ 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 });

// Role-based scope (jurisdiction) indexing
userSchema.index({ 'location.region': 1, 'location.zone': 1, 'location.woreda': 1, 'location.kebele': 1 });

// Full text search for fuzzy matching (Full Name)
userSchema.index({
  'personalInfo.firstName': 'text',
  'personalInfo.lastName': 'text',
  'personalInfo.idNumber': 'text'
});

module.exports = mongoose.model('User', userSchema);