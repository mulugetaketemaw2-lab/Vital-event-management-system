const User = require('../models/User');
const VitalEvent = require('../models/VitalEvent');
const { convertLocationCodesToNames, convertLocationNamesToCodes, getRegex, locationMapping, validateLocationHierarchy, buildJurisdictionQuery } = require('../utils/locationHelper');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Notification = require('../models/Notification');
const { notify, notifyLocationReps } = require('../utils/notificationHelper');
const Location = require('../models/Location');
const crypto = require('crypto');
const { sendApprovalEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../utils/emailService');
const identityLinkageService = require('../services/identityLinkageService');

const roleToLevel = {
  'kebele_representative': 'kebele',
  'woreda_representative': 'woreda',
  'zone_representative': 'zone',
  'region_representative': 'region',
  'national': 'national',
  'kebele': 'kebele',
  'woreda': 'woreda',
  'zone': 'zone',
  'region': 'region'
};

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    'uploads',
    'uploads/profile-photos',
    'uploads/documents',
    'uploads/certificates'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureUploadDirs();

// Temporary JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-jwt-secret-for-development-2024-ethiopia-vital-events';

const signToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// FIXED: Validate 3x4 photo using sharp
const validateAndProcessPhoto = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    // Calculate aspect ratio (3:4 = 0.75)
    const aspectRatio = width / height;
    const targetRatio = 3 / 4; // 0.75
    const tolerance = 0.05; // 5% tolerance

    console.log(`📏 Photo dimensions: ${width}x${height}, Aspect ratio: ${aspectRatio.toFixed(2)}`);
    if (Math.abs(aspectRatio - targetRatio) <= tolerance) {
      // Resize to standard 3x4 size (300x400px) for consistency
      const processedPath = filePath.replace(/(\.[\w\d_-]+)$/i, '_processed$1');
      await sharp(filePath)
        .resize(300, 400, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 90 })
        .toFile(processedPath);
      return {
        valid: true,
        originalPath: filePath,
        processedPath: processedPath,
        dimensions: { width, height }
      };
    } else {
      return {
        valid: false,
        error: `Photo aspect ratio (${aspectRatio.toFixed(2)}) should be 3:4 (0.75). Your photo: ${width}x${height}`
      };
    }
  } catch (error) {
    console.error('Photo validation error:', error);
    return {
      valid: false,
      error: 'Could not process image. Please upload a valid JPG or PNG file.'
    };
  }
};


// Validate Ethiopian Digital ID format and checksum
const validateEthiopianID = (idNumber) => {
  if (!idNumber) {
    return {
      isValid: false,
      message: 'Ethiopian Digital ID is required'
    };
  }

  // Must be at most 16 digits
  const cleanedId = idNumber.replace(/\s+/g, '');
  if (!/^\d{10,16}$/.test(cleanedId)) {
    return {
      isValid: false,
      message: 'Ethiopian Digital ID must be between 10 and 16 digits'
    };
  }

  const digits = cleanedId.split('').map(Number);

  // Check if all digits are not the same
  const allSame = digits.every(digit => digit === digits[0]);
  if (allSame) {
    return {
      isValid: false,
      message: 'Invalid Ethiopian Digital ID format'
    };
  }

  return {
    isValid: true,
    message: 'Valid Ethiopian Digital ID'
  };
};

// Validate file type
const validateFileType = (filename) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const extension = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(extension);
};

// Handle file upload
const handleFileUpload = (file, fieldname) => {
  if (!file) return null;

  const baseDir = fieldname === 'profilePhoto' ? 'profile-photos' : 'documents';

  return {
    url: `/uploads/${baseDir}/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname,
    uploadedAt: new Date(),
    verified: false
  };
};

// Handle multiple document uploads
const handleDocumentUploads = (files) => {
  if (!files || files.length === 0) return [];

  return files.map(file => ({
    type: file.fieldname || 'document',
    url: `/uploads/documents/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname,
    uploadedAt: new Date(),
    verified: false
  }));
};

// Create notification for kebele representative
const createKebeleNotification = async (citizen, kebeleRep) => {
  try {
    if (!Notification) {
      console.log('Notification model not found, skipping notification creation');
      return;
    }

    const notification = await Notification.create({
      type: 'citizen_registration',
      recipient: kebeleRep._id,
      sender: citizen._id,
      data: {
        citizenId: citizen._id,
        citizenName: `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}`,
        kebele: citizen.location.kebele,
        registrationDate: citizen.createdAt
      },
      message: `New citizen registration from ${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName} in your kebele`,
      read: false
    });

    console.log(`✅ Notification created for kebele rep: ${kebeleRep.username} (${kebeleRep._id})`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Find kebele representative for citizen's location
const findKebeleRepresentative = async (kebeleName) => {
  try {
    console.log(`🔍 Looking for kebele rep in kebele: ${kebeleName}`);

    // First, try to find by exact kebele name
    let kebeleRep = await User.findOne({
      role: { $in: ['kebele', 'kebele_representative'] },
      'location.kebele': kebeleName,
      isActive: true,
      isApproved: true
    });

    // If not found, try case-insensitive search
    if (!kebeleRep) {
      kebeleRep = await User.findOne({
        role: { $in: ['kebele', 'kebele_representative'] },
        $or: [
          { 'location.kebele': { $regex: new RegExp(`^${kebeleName}$`, 'i') } },
          { 'location.kebeleName': { $regex: new RegExp(`^${kebeleName}$`, 'i') } }
        ],
        isActive: true,
        isApproved: true
      });
    }

    if (kebeleRep) {
      console.log(`✅ Found kebele rep: ${kebeleRep.username} for kebele: ${kebeleName}`);
    } else {
      console.log(`❌ No active kebele representative found for kebele: ${kebeleName}`);
    }

    return kebeleRep;
  } catch (error) {
    console.error('Error finding kebele representative:', error);
    return null;
  }
};

// Clean up files on error
const cleanupFiles = (files) => {
  if (!files) return;

  Object.values(files).forEach(fileArray => {
    if (Array.isArray(fileArray)) {
      fileArray.forEach(file => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log(`🗑️ Cleaned up file: ${file.path}`);
          }
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      });
    }
  });
};

exports.registerCitizen = async (req, res) => {
  try {
    console.log('📝 Starting citizen registration process...');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    // Check if required files exist
    if (!req.files || !req.files.profilePhoto) {
      console.log('❌ No profile photo uploaded');
      return res.status(400).json({
        status: 'error',
        message: 'Profile photo is required'
      });
    }

    // Check required fields - handle both flat and nested structures
    const firstName = req.body['personalInfo.firstName'] || req.body.firstName || req.body.personalInfo?.firstName;
    const lastName = req.body['personalInfo.lastName'] || req.body.lastName || req.body.personalInfo?.lastName;
    const phone = req.body['personalInfo.phone'] || req.body.phone || req.body.personalInfo?.phone;
    const email = req.body['personalInfo.email'] || req.body.email || req.body.personalInfo?.email;
    const dateOfBirth = req.body['personalInfo.dateOfBirth'] || req.body.dateOfBirth || req.body.personalInfo?.dateOfBirth;
    const gender = req.body['personalInfo.gender'] || req.body.gender || req.body.personalInfo?.gender;
    const maritalStatus = req.body['personalInfo.maritalStatus'] || req.body.maritalStatus || req.body.personalInfo?.maritalStatus;
    const occupation = req.body['personalInfo.occupation'] || req.body.occupation || req.body.personalInfo?.occupation;
    const educationLevel = req.body['personalInfo.educationLevel'] || req.body.educationLevel || req.body.personalInfo?.educationLevel;
    const idNumber = req.body['personalInfo.idNumber'] || req.body.idNumber || req.body.personalInfo?.idNumber;
    const age = req.body['personalInfo.age'] || req.body.age || req.body.personalInfo?.age;
    const nationality = req.body['personalInfo.nationality'] || req.body.nationality || req.body.personalInfo?.nationality;

    // Family Info - Support both flat dotted keys and nested expanded keys
    const fatherName = req.body['personalInfo.familyInfo.fatherName'] || req.body.fatherName || req.body.personalInfo?.familyInfo?.fatherName;
    const motherName = req.body['personalInfo.familyInfo.motherName'] || req.body.motherName || req.body.personalInfo?.familyInfo?.motherName;
    const fatherOccupation = req.body['personalInfo.familyInfo.fatherOccupation'] || req.body.fatherOccupation || req.body.personalInfo?.familyInfo?.fatherOccupation;
    const motherOccupation = req.body['personalInfo.familyInfo.motherOccupation'] || req.body.motherOccupation || req.body.personalInfo?.familyInfo?.motherOccupation;
    const fatherNationality = req.body['personalInfo.familyInfo.fatherNationality'] || req.body.fatherNationality || req.body.personalInfo?.familyInfo?.fatherNationality;
    const motherNationality = req.body['personalInfo.familyInfo.motherNationality'] || req.body.motherNationality || req.body.personalInfo?.familyInfo?.motherNationality;

    // Validate date of birth is not in the future
    if (dateOfBirth && new Date(dateOfBirth) > new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Date of birth cannot be in the future.'
      });
    }

    // Parse location if sent as string
    let location = req.body.location;
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        console.error('Error parsing location:', e);
        location = {};
      }
    }

    const region = location?.region || req.body.region;
    const zone = location?.zone || req.body.zone;
    const woreda = location?.woreda || req.body.woreda;
    const kebele = location?.kebele || req.body.kebele;

    let regionName = location?.regionName || req.body.regionName || '';
    let zoneName = location?.zoneName || req.body.zoneName || '';
    let woredaName = location?.woredaName || req.body.woredaName || '';
    let kebeleName = location?.kebeleName || req.body.kebeleName || '';

    // Best-effort resolve missing location names from Location collection (by code)
    const resolveName = async (type, code) => {
      if (!code) return '';
      const doc = await Location.findOne({ type, code }).select('name').lean();
      return doc?.name || '';
    };

    try {
      if (!regionName && region) regionName = await resolveName('region', region);
      if (!zoneName && zone) zoneName = await resolveName('zone', zone);
      if (!woredaName && woreda) woredaName = await resolveName('woreda', woreda);
      if (!kebeleName && kebele) kebeleName = await resolveName('kebele', kebele);
    } catch (e) {
      console.log('⚠️ Location name resolution skipped/failed:', e.message);
    }

    // STRICT HIERARCHY VALIDATION
    const isHierarchyValid = validateLocationHierarchy({
      region,
      zone,
      woreda,
      kebele
    });

    if (!isHierarchyValid) {
      console.log('❌ Location hierarchy breach detected during registration');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid location path. The selected Zone, Woreda, and Kebele must belong to the selected Region.'
      });
    }

    // Pre-check duplicate Ethiopian Digital ID to return a user-friendly message
    if (idNumber) {
      const existingByIdNumber = await User.findOne({ 'personalInfo.idNumber': idNumber }).select('_id').lean();
      if (existingByIdNumber) {
        return res.status(409).json({
          status: 'error',
          message: 'This Ethiopian Digital ID is already registered'
        });
      }
    }

    const requiredFields = [
      { name: 'firstName', value: firstName },
      { name: 'lastName', value: lastName },
      { name: 'phone', value: phone },
      { name: 'password', value: req.body.password },
      { name: 'kebele', value: kebele },
      { name: 'fatherName', value: fatherName },
      { name: 'motherName', value: motherName }
    ];

    for (const field of requiredFields) {
      if (!field.value) {
        console.log(`❌ Missing required field: ${field.name}`);
        return res.status(400).json({
          status: 'error',
          message: `${field.name} is required`
        });
      }
    }

    // Check if phone already exists
    const existingUser = await User.findOne({ 'personalInfo.phone': phone });

    if (existingUser) {
      console.log('❌ User already exists with phone:', phone);
      return res.status(409).json({
        status: 'error',
        message: 'A user with this phone number is already registered'
      });
    }

    // Handle file uploads
    const profilePhoto = req.files.profilePhoto[0];
    console.log('Profile photo details:', {
      originalname: profilePhoto.originalname,
      mimetype: profilePhoto.mimetype,
      size: profilePhoto.size
    });

    const username = req.body.username || `citizen_${phone}`;
    const photoUrl = `/uploads/${profilePhoto.filename}`;

    // Create new citizen user
    const user = new User({
      username,
      password: req.body.password,
      role: 'citizen',
      status: 'pending',
      personalInfo: {
        firstName,
        lastName,
        email: email || '',
        phone,
        idNumber: idNumber || '',
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || '',
        maritalStatus: maritalStatus || undefined,
        occupation: occupation || '',
        educationLevel: educationLevel || undefined,
        photo: {
          url: photoUrl,
          filename: profilePhoto.filename,
          uploadedAt: new Date()
        },
        age: age || undefined,
        nationality: nationality || 'Ethiopian',
        familyInfo: {
          fatherName: fatherName || '',
          motherName: motherName || '',
          fatherOccupation: fatherOccupation || '',
          motherOccupation: motherOccupation || '',
          fatherNationality: fatherNationality || '',
          motherNationality: motherNationality || ''
        }
      },
      location: {
        region,
        regionName,
        zone,
        zoneName,
        woreda,
        woredaName,
        kebele: kebeleName || kebele,
        kebeleCode: kebele,
        kebeleName
      },
      profilePhoto: {
        url: photoUrl,
        filename: profilePhoto.filename,
        originalName: profilePhoto.originalname,
        uploadedAt: new Date(),
        verified: false
      },
      idCard: req.files.idCard ? {
        url: `/uploads/${req.files.idCard[0].filename}`,
        filename: req.files.idCard[0].filename,
        originalName: req.files.idCard[0].originalname,
        uploadedAt: new Date(),
        verified: false
      } : undefined,
      documents: req.files.documents ? req.files.documents.map(doc => ({
        type: 'document',
        url: `/uploads/${doc.filename}`,
        filename: doc.filename,
        originalName: doc.originalname,
        uploadedAt: new Date(),
        verified: false
      })) : [],
      familyMembers: req.body.familyMembers ? JSON.parse(req.body.familyMembers) : []
    });

    await user.save();

    console.log('✅ Citizen registered successfully:', user._id);

    // 1. Notify Citizen
    await notify({
      recipient: user._id,
      type: 'citizen_registration',
      category: 'success',
      message: 'Your registration has been submitted and is pending Kebele review.',
      data: { userId: user._id }
    });

    // 2. Notify Kebele Representatives
    await notifyLocationReps({
      level: 'kebele',
      location: user.location,
      type: 'citizen_registration',
      category: 'action_required',
      message: `New citizen registration from ${firstName} ${lastName} in your kebele.`,
      data: { citizenId: user._id, name: `${firstName} ${lastName}` }
    });

    res.status(201).json({
      status: 'success',
      message: 'Registration submitted successfully! Your account is pending Kebele review.',
      data: {
        userId: user._id,
        status: user.status
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);

    if (error && (error.code === 11000 || error.code === 11001)) {
      const key = Object.keys(error.keyValue || {})[0] || '';
      if (key.includes('personalInfo.idNumber')) {
        return res.status(409).json({
          status: 'error',
          message: 'This Ethiopian Digital ID is already registered'
        });
      }
      if (key.includes('username')) {
        return res.status(409).json({
          status: 'error',
          message: 'Username already exists'
        });
      }
      if (key.includes('personalInfo.phone')) {
        return res.status(409).json({
          status: 'error',
          message: 'A user with this phone number is already registered'
        });
      }
      return res.status(409).json({
        status: 'error',
        message: 'Duplicate value. Please use different information.'
      });
    }

    res.status(500).json({
      status: 'error',
      message: error.message || 'Registration failed',
      error: error.message
    });
  }
};
// Main citizen registration function
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        errors: errors.array()
      });
    }

    console.log('Registration request body:', req.body);

    const { username, password, role, personalInfo, location, officeInfo } = req.body;

    // Validate date of birth is not in the future
    if (personalInfo?.dateOfBirth && new Date(personalInfo.dateOfBirth) > new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Date of birth cannot be in the future.'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Username already exists'
      });
    }

    // Check if phone or ID already exists
    const phone = personalInfo?.phone;
    const idNumber = personalInfo?.idNumber;

    if (idNumber) {
      const existingById = await User.findOne({ 'personalInfo.idNumber': idNumber });
      if (existingById) {
        return res.status(409).json({
          status: 'error',
          message: 'This Ethiopian Digital ID is already registered'
        });
      }
    }

    if (phone) {
      const existingByPhone = await User.findOne({ 'personalInfo.phone': phone });
      if (existingByPhone) {
        return res.status(409).json({
          status: 'error',
          message: 'A user with this phone number is already registered'
        });
      }
    }
    if (role === 'citizen') {
      if (!location || !location.region || !location.zone || !location.woreda || !location.kebele) {
        return res.status(400).json({
          status: 'error',
          message: 'Please select complete location (Region, Zone, Woreda, and Kebele)'
        });
      }
    }

    // STRICT HIERARCHY VALIDATION
    if (role !== 'national' && location) {
      if (!validateLocationHierarchy(location)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid location path. The selected administrative levels must be hierarchical (e.g., Kebele must belong to the selected Wereda).'
        });
      }
    }
    // National representatives can register themselves without approval
    if (role === 'national') {
      const existingNational = await User.findOne({ role: 'national' });
      if (existingNational) {
        return res.status(400).json({
          status: 'error',
          message: 'National Representative already exists in the system'
        });
      }

      const userData = {
        username,
        password,
        role,
        personalInfo,
        officeInfo,
        isActive: true,
        isApproved: true
      };

      const newUser = await User.create(userData);

      // Send welcome email
      sendWelcomeEmail(newUser).catch(err => console.error('Welcome email failed:', err));

      return createSendToken(newUser, 201, res);
    }

    // Citizens can self-register
    if (role === 'citizen') {
      const userData = {
        username,
        password,
        role,
        personalInfo,
        location,
        status: 'pending',
        isActive: false,
        isApproved: false
      };

      const newUser = await User.create(userData);

      // Send welcome email
      sendWelcomeEmail(newUser).catch(err => console.error('Welcome email failed:', err));

      return createSendToken(newUser, 201, res);
    }

    // For other roles, must be created by higher-level representative
    if (!req.user) {
      return res.status(403).json({
        status: 'error',
        message: 'Only higher-level representatives can create this account type'
      });
    }

    const creator = await User.findById(req.user.id);
    if (!canCreateRole(creator.role, role)) {
      return res.status(403).json({
        status: 'error',
        message: `You don't have permission to create ${role} accounts`
      });
    }

    const userData = {
      username,
      password,
      role,
      personalInfo,
      location,
      officeInfo,
      createdBy: req.user.id,
      isActive: false,
      isApproved: false
    };

    const newUser = await User.create(userData);

    // Send welcome email
    sendWelcomeEmail(newUser).catch(err => console.error('Welcome email failed:', err));

    res.status(201).json({
      status: 'success',
      message: `${role} representative account created successfully. They can login after activation.`,
      data: {
        user: newUser
      }
    });

  } catch (error) {
    console.error('Registration error details:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Registration failed'
    });
  }
};
// Get pending citizens for kebele review
exports.getPendingCitizens = async (req, res) => {
  try {
    const kebeleRep = req.user;

    if (!isKebeleRole(kebeleRep.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can access this endpoint'
      });
    }

    const jurisdictionQuery = buildJurisdictionQuery(kebeleRep.location, kebeleRep.role);
    console.log(`🔍 Fetching pending citizens with query:`, JSON.stringify(jurisdictionQuery));

    // Get citizens pending review for this kebele jurisdiction (Shared path)
    const citizens = await User.find({
      ...jurisdictionQuery,
      role: 'citizen',
      status: { $in: ['pending', 'pending_verification'] }
    }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        citizens
      }
    });
  } catch (error) {
    console.error('Error fetching pending citizens:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch pending citizens'
    });
  }
};

// Get citizens by kebele
exports.getKebeleCitizens = async (req, res) => {
  try {
    const kebeleRep = req.user;

    if (!isKebeleRole(kebeleRep.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can access this endpoint'
      });
    }

    const jurisdictionQuery = buildJurisdictionQuery(kebeleRep.location, kebeleRep.role);
    console.log(`🔍 Fetching ALL citizens with query:`, JSON.stringify(jurisdictionQuery));

    // Get ALL citizens from this kebele (including approved ones)
    const citizens = await User.find({
      ...jurisdictionQuery,
      role: 'citizen'
    }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        citizens
      }
    });
  } catch (error) {
    console.error('Error fetching kebele citizens:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch citizens'
    });
  }
};

// Review citizen (approve/reject)
exports.reviewCitizen = async (req, res) => {
  try {
    const kebeleRep = req.user;

    if (!isKebeleRole(kebeleRep.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can review citizens'
      });
    }

    const { id } = req.params;
    const { status, comments } = req.body;

    // Find the citizen
    const citizen = await User.findById(id);
    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'Citizen not found'
      });
    }

    const normalizedStatus = (status || '').toString().toLowerCase();

    if (!['approved', 'rejected'].includes(normalizedStatus)) {
      return res.status(400).json({
        status: 'error',
        message: "Status must be either 'approved' or 'rejected'"
      });
    }

    // Verify Kebele match
    const repKebele = kebeleRep.location?.kebele || '';
    const repKebeleCode = kebeleRep.location?.kebeleCode || '';
    const citizenKebele = citizen.location?.kebele || '';
    const citizenKebeleCode = citizen.location?.kebeleCode || '';

    const matches = (repKebele && (repKebele === citizenKebele || repKebele === citizenKebeleCode)) ||
      (repKebeleCode && (repKebeleCode === citizenKebele || repKebeleCode === citizenKebeleCode));

    if (!matches && repKebele.toLowerCase() !== citizenKebele.toLowerCase()) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only review citizens from your assigned kebele'
      });
    }

    citizen.reviewedAt = new Date();
    citizen.reviewedBy = kebeleRep._id;
    citizen.reviewComments = comments;

    if (normalizedStatus === 'approved') {
      citizen.isApproved = true;
      citizen.isActive = false; // Not active until woreda approves
      citizen.idVerified = true;
      citizen.status = 'pending_woreda'; // Forward to woreda instead of final approval
      citizen.approvedBy = kebeleRep._id;
      citizen.kebeleApprovalDate = new Date(); // Track kebele approval

      // Use a safe approach to update kebeleVerification sub-document
      if (!citizen.kebeleVerification) {
        citizen.kebeleVerification = {};
      }

      if (req.files) {
        if (req.files.seal && req.files.seal[0]) {
          citizen.kebeleVerification.seal = {
            url: `/uploads/verification/${req.files.seal[0].filename}`,
            filename: req.files.seal[0].filename
          };
        }
        if (req.files.signature && req.files.signature[0]) {
          citizen.kebeleVerification.signature = {
            url: `/uploads/verification/${req.files.signature[0].filename}`,
            filename: req.files.signature[0].filename
          };
        }
      }

      citizen.kebeleVerification.officerName = req.body.officerName || kebeleRep.username;
      citizen.kebeleVerification.approvedAt = new Date();

      citizen.approvedAt = undefined; // Remove final approval date
      citizen.rejectedAt = undefined;
      citizen.rejectedBy = undefined;
    } else {
      citizen.isApproved = false;
      citizen.isActive = false;
      citizen.status = 'rejected';
      citizen.rejectedAt = new Date();
      citizen.rejectedBy = kebeleRep._id;
    }

    await citizen.save();

    const citizenFullName = citizen.personalInfo ? `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}` : (citizen.username || 'Citizen');
    console.log(`✅ Citizen ${normalizedStatus} by Kebele: ${citizenFullName}`);

    // 1. Notify Citizen
    await notify({
      recipient: citizen._id,
      type: normalizedStatus === 'approved' ? 'citizen_approved' : 'citizen_rejected',
      category: normalizedStatus === 'approved' ? 'success' : 'action_required',
      message: normalizedStatus === 'approved' 
        ? 'Your account has been approved by the Kebele Representative. It has been forwarded to Woreda for final verification.'
        : `Your account registration was rejected. Reason: ${comments || 'Information mismatch'}`,
      data: { reviewerId: kebeleRep._id }
    });

    // 2. Notify Woreda Rep if approved by Kebele
    if (normalizedStatus === 'approved') {
      try {
        const woredaRep = await User.findOne({
          role: { $in: ['woreda', 'woreda_representative'] },
          'location.region': citizen.location?.region,
          'location.zone': citizen.location?.zone,
          'location.woreda': citizen.location?.woreda
        });

        if (woredaRep) {
          await notify({
            recipient: woredaRep._id,
            type: 'citizen_woreda_review',
            category: 'action_required',
            message: `New citizen registration forwarded from Kebele for Woreda review: ${citizenFullName}`,
            data: { 
                citizenId: citizen._id,
                citizenName: citizenFullName,
                kebele: citizen.location?.kebele,
                forwardedBy: 'kebele'
            }
          });
        }
      } catch (err) {
        console.error('Failed to notify woreda rep:', err);
      }
    }

    res.status(200).json({
      status: 'success',
      message: normalizedStatus === 'approved'
        ? 'Citizen approved by Kebele and forwarded to Woreda'
        : 'Citizen rejected by Kebele',
      data: { citizen }
    });
  } catch (error) {
    console.error('Error reviewing citizen:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to review citizen'
    });
  }
};

// --- NEW: HIERARCHICAL REGISTRATION REVIEW (Woreda, Zone, Region, National) ---

exports.reviewCitizenHighLevel = async (req, res) => {
  try {
    const reviewer = req.user;
    const { id } = req.params;
    const { status, comments, officerName } = req.body;
    const normalizedRole = roleToLevel[reviewer.role] || reviewer.role;

    if (!['woreda', 'zone', 'region', 'national'].includes(normalizedRole)) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized high-level review'
      });
    }

    const citizen = await User.findById(id);
    if (!citizen) return res.status(404).json({ status: 'error', message: 'Citizen not found' });

    const normalizedStatus = (status || '').toString().toLowerCase();

    // Status / Level Transition Map
    const levelMap = {
      woreda: { current: 'pending_woreda', next: 'pending_zone', nextStatus: 'pending_zone', nextRole: 'zone' },
      zone: { current: 'pending_zone', next: 'pending_region', nextStatus: 'pending_region', nextRole: 'region' },
      region: { current: 'pending_region', next: 'pending_national', nextStatus: 'pending_national', nextRole: 'national' },
      national: { current: 'pending_national', next: 'completed', nextStatus: 'approved', nextRole: null }
    };

    const config = levelMap[normalizedRole];

    if (citizen.status !== config.current) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid registration status for ${normalizedRole} review. Current status: ${citizen.status}`
      });
    }

    // Jurisdiction Check (Strict)
    const revLoc = reviewer.location || {};
    const citLoc = citizen.location || {};
    let hasJurisdiction = false;

    // Helper functions exist in authController: convertLocationCodesToNames, convertLocationNamesToCodes
    const revLocNames = convertLocationCodesToNames(revLoc);
    const revLocCodes = convertLocationNamesToCodes(revLoc);
    const citLocNames = convertLocationCodesToNames(citLoc);
    const citLocCodes = convertLocationNamesToCodes(citLoc);

    const checkMatch = (field) => {
      // Compare combining codes and names to ensure robust matching
      return (revLoc[field] === citLoc[field]) ||
        (revLocNames[field] === citLocNames[field]) ||
        (revLocCodes[field] === citLocCodes[`${field}Code`]) ||
        (revLoc[`${field}Name`] && citLoc[`${field}Name`] && revLoc[`${field}Name`] === citLoc[`${field}Name`]);
    };

    if (normalizedRole === 'national') hasJurisdiction = true;
    else if (normalizedRole === 'region') hasJurisdiction = checkMatch('region');
    else if (normalizedRole === 'zone') hasJurisdiction = (checkMatch('region') && checkMatch('zone'));
    else if (normalizedRole === 'woreda') hasJurisdiction = (checkMatch('region') && checkMatch('zone') && checkMatch('woreda'));

    if (!hasJurisdiction) {
      return res.status(403).json({
        status: 'error',
        message: `You do not have jurisdiction to review citizens from this location (${citLoc.kebele})`
      });
    }

    // Process Review
    if (normalizedStatus === 'approved') {
      citizen.status = config.nextStatus;

      // Store verification details
      const verification = {
        level: normalizedRole,
        reviewer: reviewer._id,
        officerName: officerName || reviewer.username,
        reviewedAt: new Date(),
        comments: comments || ''
      };

      // Handle photos for Woreda (Seal/Signature)
      if (normalizedRole === 'woreda' && req.files) {
        if (req.files.seal && req.files.seal[0]) {
          verification.seal = {
            url: `/uploads/verification/${req.files.seal[0].filename}`,
            filename: req.files.seal[0].filename
          };
        }
        if (req.files.signature && req.files.signature[0]) {
          verification.signature = {
            url: `/uploads/verification/${req.files.signature[0].filename}`,
            filename: req.files.signature[0].filename
          };
        }
      }

      if (!citizen.verificationHistory) citizen.verificationHistory = [];
      citizen.verificationHistory.push(verification);

      // Explicitly set woredaVerification if this is the woreda review
      if (normalizedRole === 'woreda') {
        citizen.woredaVerification = {
          officerName: verification.officerName,
          approvedAt: verification.reviewedAt,
          seal: verification.seal,
          signature: verification.signature
        };
      }

      // Final Approval Logic
      if (normalizedRole === 'national') {
        citizen.isApproved = true;
        citizen.isActive = true;
        citizen.idVerified = true;
        citizen.approvedAt = new Date();
      } else {
        // 1. Notify Citizen
        await notify({
          recipient: citizen._id,
          type: normalizedRole === 'national' ? 'citizen_approved' : 'citizen_verification',
          category: 'success',
          message: normalizedRole === 'national' 
            ? 'Your account has been fully approved. You now have full access to the system.'
            : `Your account has been verified by ${normalizedRole} and forwarded to ${config.nextRole} for final review.`,
          data: { level: normalizedRole }
        });

        if (normalizedRole !== 'national') {
          // Find next representative to notify
          try {
            const nextQuery = { role: { $regex: new RegExp(config.nextRole, 'i') } };
            if (config.nextRole !== 'national') {
              nextQuery['location.region'] = citLoc.region;
              if (config.nextRole === 'woreda' || config.nextRole === 'zone') {
                nextQuery['location.zone'] = citLoc.zone;
              }
            }
            const nextRep = await User.findOne(nextQuery);
            if (nextRep) {
              await notify({
                recipient: nextRep._id,
                type: `citizen_${config.nextRole}_review`,
                category: 'action_required',
                message: `Citizen registration from ${citLoc.woreda} forwarded for ${config.nextRole} review.`,
                data: { citizenId: citizen._id }
              });
            }
          } catch (err) { console.error('Notification failed:', err); }
        }
      }
    } else if (normalizedStatus === 'rejected') {
      citizen.status = 'rejected';
      citizen.isActive = false;
      citizen.rejectedAt = new Date();
      citizen.rejectedBy = reviewer._id;
      citizen.reviewComments = comments;
    }

    await citizen.save();

    res.status(200).json({
      status: 'success',
      message: `Citizen registration ${normalizedStatus} by ${normalizedRole}`,
      data: { citizen }
    });

  } catch (err) {
    console.error(`Review error at ${req.user.role}:`, err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Get citizens for review/view by any representative level (jurisdiction filtered)
exports.getCitizensForReview = async (req, res) => {
  try {
    const user = req.user;

    const normalizedRole = roleToLevel[user.role] || user.role;

    if (!['kebele', 'woreda', 'zone', 'region', 'national'].includes(normalizedRole)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only representatives can access this endpoint'
      });
    }

    const buildJurisdictionQuery = () => {
      if (!user.location) return null;

      const userLocNames = convertLocationCodesToNames(user.location) || {};
      const userLocCodes = convertLocationNamesToCodes(user.location) || {};

      const buildCleanOr = (fieldPath, values) => {
        const cleanValues = values.filter(v => v !== undefined && v !== null && v !== '');
        if (cleanValues.length === 0) return { [fieldPath]: '__NON_EXISTENT__' };

        const orArray = cleanValues.map(v => ({ [fieldPath]: v }));
        if (fieldPath === 'location.region') {
          cleanValues.forEach(v => orArray.push({ 'location.regionName': v }, { 'location.regionCode': v }));
        } else if (fieldPath === 'location.zone') {
          cleanValues.forEach(v => orArray.push({ 'location.zoneName': v }, { 'location.zoneCode': v }));
        } else if (fieldPath === 'location.woreda') {
          cleanValues.forEach(v => orArray.push({ 'location.woredaName': v }, { 'location.woredaCode': v }));
        } else if (fieldPath === 'location.kebele') {
          cleanValues.forEach(v => orArray.push({ 'location.kebeleName': v }, { 'location.kebeleCode': v }));
        }

        cleanValues.forEach(v => {
          const regex = getRegex(v);
          if (regex) orArray.push({ [fieldPath]: regex });
        });
        return { $or: orArray };
      };

      if (normalizedRole === 'kebele' && (user.location.kebele || user.location.kebeleCode)) {
        const kebeleVal = user.location.kebele || user.location.kebeleCode;
        return {
          $and: [
            { $or: [{ 'location.region': userLocNames.region }, { 'location.region': userLocNames.regionCode }, { 'location.region': userLocCodes.region }, { 'location.region': userLocCodes.regionCode }, { 'location.regionName': userLocNames.region }, { 'location.region': getRegex(userLocNames.region) }] },
            { $or: [{ 'location.zone': userLocNames.zone }, { 'location.zone': userLocNames.zoneCode }, { 'location.zone': userLocCodes.zone }, { 'location.zone': userLocCodes.zoneCode }, { 'location.zoneName': userLocNames.zone }, { 'location.zone': getRegex(userLocNames.zone) }] },
            { $or: [{ 'location.woreda': userLocNames.woreda }, { 'location.woreda': userLocNames.woredaCode }, { 'location.woreda': userLocCodes.woreda }, { 'location.woreda': userLocCodes.woredaCode }, { 'location.woredaName': userLocNames.woreda }, { 'location.woreda': getRegex(userLocNames.woreda) }] },
            { $or: [{ 'location.kebele': kebeleVal }, { 'location.kebele': userLocNames.kebeleCode }, { 'location.kebeleName': userLocNames.kebele }, { 'location.kebele': userLocCodes.kebeleCode }, { 'location.kebele': getRegex(kebeleVal) }] }
          ]
        };
      }

      if (normalizedRole === 'woreda' && user.location?.woreda) {
        return {
          $and: [
            buildCleanOr('location.region', [userLocNames.region, userLocNames.regionCode, userLocCodes.region, userLocCodes.regionCode]),
            buildCleanOr('location.zone', [userLocNames.zone, userLocNames.zoneCode, userLocCodes.zone, userLocCodes.zoneCode]),
            buildCleanOr('location.woreda', [userLocNames.woreda, userLocNames.woredaCode, userLocCodes.woreda, userLocCodes.woredaCode])
          ]
        };
      }

      if (normalizedRole === 'zone' && user.location?.zone) {
        return {
          $and: [
            buildCleanOr('location.region', [userLocNames.region, userLocNames.regionCode, userLocCodes.region, userLocCodes.regionCode]),
            buildCleanOr('location.zone', [userLocNames.zone, userLocNames.zoneCode, userLocCodes.zone, userLocCodes.zoneCode])
          ]
        };
      }

      if (normalizedRole === 'region' && user.location?.region) {
        return buildCleanOr('location.region', [userLocNames.region, userLocNames.regionCode, userLocCodes.region, userLocCodes.regionCode]);
      }

      return normalizedRole === 'national' ? {} : null;
    };

    const jurisdictionQuery = buildJurisdictionQuery();

    if (jurisdictionQuery === null) {
      return res.status(200).json({
        status: 'success',
        data: {
          citizens: [],
          grouped: { pending: [], approved: [], rejected: [] },
          counts: { total: 0, pending: 0, approved: 0, rejected: 0 }
        }
      });
    }

    const citizens = await User.find({
      role: 'citizen',
      isChild: { $ne: true },  // STRICT ISOLATION: exclude vital-event child accounts
      ...jurisdictionQuery
    })
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .lean();

    const statusMap = {
      kebele: ['pending', 'pending_verification'],
      woreda: ['pending_woreda'],
      zone: [], // No pending for high levels
      region: [],
      national: []
    };

    const targetStatuses = statusMap[normalizedRole] || [];

    const grouped = {
      pending: citizens.filter(c => targetStatuses.includes(c.status)),
      approved: citizens.filter(c => {
        // High levels (Zone, Region, National) can view all approved/verified citizens
        return c.status === 'approved' || c.status === 'verified' || c.isApproved;
      }),
      rejected: citizens.filter(c => c.status.startsWith('rejected'))
    };

    res.status(200).json({
      status: 'success',
      data: {
        citizens,
        grouped,
        counts: {
          total: citizens.length,
          pending: grouped.pending.length,
          approved: grouped.approved.length,
          rejected: grouped.rejected.length
        }
      }
    });
  } catch (error) {
    console.error('Get citizens for review error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch citizens'
    });
  }
};

// Role restriction middleware
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // Development: Handle test tokens
    if (token.startsWith('test-token-')) {
      let testUser;

      if (token === 'test-token-national') {
        testUser = {
          _id: 'test-national',
          username: 'national.rep',
          role: 'national',
          personalInfo: {
            firstName: 'National',
            lastName: 'Representative'
          },
          location: {
            region: 'Addis Ababa',
            zone: '',
            woreda: '',
            kebele: ''
          }
        };
      } else if (token === 'test-token-regional') {
        testUser = {
          _id: 'test-regional',
          username: 'region.rep',
          role: 'region_representative',
          personalInfo: {
            firstName: 'Regional',
            lastName: 'Representative'
          },
          location: {
            region: '1',
            regionName: 'Addis Ababa',
            zone: '',
            zoneName: '',
            woreda: '',
            woredaName: '',
            kebele: '',
            kebeleName: ''
          }
        };
      } else if (token === 'test-token-zone') {
        testUser = {
          _id: 'test-zone',
          username: 'zone.rep',
          role: 'zone_representative',
          personalInfo: {
            firstName: 'Zone',
            lastName: 'Representative'
          },
          location: {
            region: '1',
            regionName: 'Addis Ababa',
            zone: '1_1',
            zoneName: 'Addis Ketema',
            woreda: '',
            woredaName: '',
            kebele: '',
            kebeleName: ''
          }
        };
      } else {
        // Default kebele test token
        testUser = {
          _id: 'test123',
          username: 'kebele1',
          role: 'kebele_representative',
          location: {
            kebele: 'Test Kebele',
            kebeleName: 'Test Kebele',
            woreda: 'Test Woreda',
            woredaName: 'Test Woreda',
            zone: 'Test Zone',
            zoneName: 'Test Zone',
            region: 'Test Region',
            regionName: 'Test Region'
          }
        };
      }

      req.user = testUser;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    req.user = currentUser;
    next();
  } catch (error) {
    console.error('Protect middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid token. Please log in again.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired. Please log in again.'
      });
    }

    res.status(401).json({
      status: 'error',
      message: 'Authentication failed.'
    });
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -__v');

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 0. Restrict to citizens only
    if (req.user.role !== 'citizen') {
      return res.status(403).json({
        status: 'error',
        message: 'Only citizens can self-change passwords. Representatives must contact their supervisor for security updates.'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters long'
      });
    }

    // 1. Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // 2. Check if current password is correct
    if (!(await user.correctPassword(currentPassword))) {
      return res.status(401).json({
        status: 'error',
        message: 'Your current password is incorrect'
      });
    }

    // 3. Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password successfully updated'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;

    // Remove restricted fields
    delete updates.password;
    delete updates.role;
    delete updates.isApproved;
    delete updates.idVerified;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -__v');

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// --- UPDATE REQUEST WORKFLOW ---

// 1. Citizen initiates update request
exports.initiateUpdateRequest = async (req, res) => {
  try {
    const { justification } = req.body;
    if (!justification) {
      return res.status(400).json({ status: 'error', message: 'Justification is mandatory for update requests' });
    }

    const citizenId = req.user._id || req.user.id;
    const citizen = await User.findById(citizenId);
    if (!citizen) return res.status(404).json({ status: 'error', message: 'Citizen not found' });

    // Store pending details
    const pendingDetails = {};

    if (req.body.personalInfo) {
      const pInfo = typeof req.body.personalInfo === 'string'
        ? JSON.parse(req.body.personalInfo)
        : req.body.personalInfo;
      
      // SECURITY: Ignore changes to idNumber during update if it's already a permanent ID
      if (!citizen.identityLinkage?.is_temporary_id) {
          if (pInfo.idNumber && pInfo.idNumber !== citizen.personalInfo.idNumber) {
              console.log(`🛡️ Blocking idNumber change attempt from ${citizen.personalInfo.idNumber} to ${pInfo.idNumber}`);
              pInfo.idNumber = citizen.personalInfo.idNumber; // Revert to original
          }
      } else {
          // If it IS a temporary ID, validate that the NEW idNumber is max 16 digits
          if (pInfo.idNumber && pInfo.idNumber.length > 16) {
              return res.status(400).json({ status: 'error', message: 'National ID must be at most 16 digits' });
          }
      }

      pendingDetails.personalInfo = pInfo;
    }

    if (req.body.location) {
      pendingDetails.location = typeof req.body.location === 'string'
        ? JSON.parse(req.body.location)
        : req.body.location;
    }

    // Handle file updates
    if (req.files) {
      if (req.files.profilePhoto) {
        pendingDetails.profilePhoto = {
          url: `/uploads/${req.files.profilePhoto[0].filename}`,
          filename: req.files.profilePhoto[0].filename,
          originalName: req.files.profilePhoto[0].originalname,
          uploadedAt: new Date()
        };
      }
      if (req.files.idCard) {
        pendingDetails.idCard = {
          url: `/uploads/${req.files.idCard[0].filename}`,
          filename: req.files.idCard[0].filename,
          originalName: req.files.idCard[0].originalname,
          uploadedAt: new Date()
        };
      }
      if (req.files.documents) {
        pendingDetails.documents = req.files.documents.map(file => ({
          url: `/uploads/${file.filename}`,
          filename: file.filename,
          originalName: file.originalname,
          uploadedAt: new Date()
        }));
      }
    }

    citizen.updateRequest = {
      status: 'pending',
      pendingDetails,
      justification,
      requestedAt: new Date()
    };

    await citizen.save();

    res.status(200).json({
      status: 'success',
      message: 'Update request submitted to Kebele for review',
      data: { citizen }
    });
  } catch (err) {
    console.error('Update initiation error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// 1.5. Fetch single update request details
exports.getUpdateDetails = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const user = req.user;

    const citizen = await User.findById(citizenId).select('-password -__v');
    if (!citizen) {
      return res.status(404).json({ status: 'error', message: 'Citizen not found' });
    }

    if (!citizen.updateRequest || citizen.updateRequest.status === 'none') {
      return res.status(400).json({ status: 'error', message: 'No active update request for this citizen' });
    }

    // Role-based jurisdiction check (Robust comparison for codes or names)
    const userLoc = user.location || {};
    const citLoc = citizen.location || {};

    let hasAccess = false;
    if (user.role === 'national') hasAccess = true;
    else if (user.role.includes('region')) {
      hasAccess = (userLoc.region === citLoc.region);
    } else if (user.role.includes('zone')) {
      hasAccess = (userLoc.region === citLoc.region && userLoc.zone === citLoc.zone);
    } else if (user.role.includes('woreda')) {
      hasAccess = (userLoc.region === citLoc.region && userLoc.zone === citLoc.zone && userLoc.woreda === citLoc.woreda);
    } else if (user.role.includes('kebele')) {
      hasAccess = (userLoc.region === citLoc.region && userLoc.zone === citLoc.zone && userLoc.woreda === citLoc.woreda && (userLoc.kebele === citLoc.kebele || userLoc.kebeleCode === citLoc.kebeleCode));
    }

    if (!hasAccess) {
      return res.status(403).json({ status: 'error', message: 'You do not have permission to view this update request' });
    }

    res.status(200).json({
      status: 'success',
      data: { citizen }
    });
  } catch (err) {
    console.error('Get update details error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Placeholder for missing functions to prevent server crash
exports.getPendingUpdates = async (req, res) => {
  try {
    res.status(200).json({ status: 'success', data: { updates: [] } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.reviewUpdateKebele = async (req, res) => {
  try {
    res.status(200).json({ status: 'success', message: 'Kebele update review (stub)' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.reviewUpdateWoreda = async (req, res) => {
  try {
    res.status(200).json({ status: 'success', message: 'Woreda update review (stub)' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.reviewUpdateHighLevel = async (req, res) => {
  try {
    res.status(200).json({ status: 'success', message: 'High level update review (stub)' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

exports.reviewCitizenHighLevel = async (req, res) => {
  try {
    res.status(200).json({ status: 'success', message: 'Citizen high level review (stub)' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};


// Export citizens (jurisdiction-filtered)
exports.exportCitizens = async (req, res) => {
  try {
    const user = req.user;
    const normalizedRole = roleToLevel[user.role] || user.role;

    if (!['kebele', 'woreda', 'zone', 'region', 'national'].includes(normalizedRole)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only representatives can access this endpoint'
      });
    }

    const buildJurisdictionQuery = () => {
      if (!user.location) return null;

      const userLocNames = convertLocationCodesToNames(user.location) || {};
      const userLocCodes = convertLocationNamesToCodes(user.location) || {};

      const buildCleanOr = (fieldPath, values) => {
        const cleanValues = values.filter(v => v !== undefined && v !== null && v !== '');
        if (cleanValues.length === 0) return { [fieldPath]: '__NON_EXISTENT__' };

        const orArray = cleanValues.map(v => ({ [fieldPath]: v }));
        if (fieldPath === 'location.region') {
          cleanValues.forEach(v => orArray.push({ 'location.regionName': v }, { 'location.regionCode': v }));
        } else if (fieldPath === 'location.zone') {
          cleanValues.forEach(v => orArray.push({ 'location.zoneName': v }, { 'location.zoneCode': v }));
        } else if (fieldPath === 'location.woreda') {
          cleanValues.forEach(v => orArray.push({ 'location.woredaName': v }, { 'location.woredaCode': v }));
        } else if (fieldPath === 'location.kebele') {
          cleanValues.forEach(v => orArray.push({ 'location.kebeleName': v }, { 'location.kebeleCode': v }));
        }

        cleanValues.forEach(v => {
          const regex = getRegex(v);
          if (regex) orArray.push({ [fieldPath]: regex });
        });
        return { $or: orArray };
      };

      if (normalizedRole === 'kebele' && (user.location.kebele || user.location.kebeleCode)) {
        const kebeleVal = user.location.kebele || user.location.kebeleCode;
        return {
          $and: [
            { $or: [{ 'location.region': userLocNames.region }, { 'location.region': userLocNames.regionCode }, { 'location.region': userLocCodes.region }, { 'location.region': userLocCodes.regionCode }, { 'location.regionName': userLocNames.region }, { 'location.region': getRegex(userLocNames.region) }] },
            { $or: [{ 'location.zone': userLocNames.zone }, { 'location.zone': userLocNames.zoneCode }, { 'location.zone': userLocCodes.zone }, { 'location.zone': userLocCodes.zoneCode }, { 'location.zoneName': userLocNames.zone }, { 'location.zone': getRegex(userLocNames.zone) }] },
            { $or: [{ 'location.woreda': userLocNames.woreda }, { 'location.woreda': userLocNames.woredaCode }, { 'location.woreda': userLocCodes.woreda }, { 'location.woreda': userLocCodes.woredaCode }, { 'location.woredaName': userLocNames.woreda }, { 'location.woreda': getRegex(userLocNames.woreda) }] },
            { $or: [{ 'location.kebele': kebeleVal }, { 'location.kebele': userLocNames.kebeleCode }, { 'location.kebeleName': userLocNames.kebele }, { 'location.kebele': userLocCodes.kebeleCode }, { 'location.kebele': getRegex(kebeleVal) }] }
          ]
        };
      }

      if (normalizedRole === 'woreda' && user.location?.woreda) {
        return {
          $and: [
            buildCleanOr('location.region', [userLocNames.region, userLocNames.regionCode, userLocCodes.region, userLocCodes.regionCode]),
            buildCleanOr('location.zone', [userLocNames.zone, userLocNames.zoneCode, userLocCodes.zone, userLocCodes.zoneCode]),
            buildCleanOr('location.woreda', [userLocNames.woreda, userLocNames.woredaCode, userLocCodes.woreda, userLocCodes.woredaCode])
          ]
        };
      }

      if (normalizedRole === 'zone' && user.location?.zone) {
        return {
          $and: [
            buildCleanOr('location.region', [userLocNames.region, userLocNames.regionCode, userLocCodes.region, userLocCodes.regionCode]),
            buildCleanOr('location.zone', [userLocNames.zone, userLocNames.zoneCode, userLocCodes.zone, userLocCodes.zoneCode])
          ]
        };
      }

      if (normalizedRole === 'region' && user.location?.region) {
        return buildCleanOr('location.region', [userLocNames.region, userLocNames.regionCode, userLocCodes.region, userLocCodes.regionCode]);
      }

      if (normalizedRole === 'national') {
        return {};
      }

      return null;
    };

    const query = buildJurisdictionQuery();
    if (!query) {
      return res.status(403).json({
        status: 'error',
        message: 'Unable to determine jurisdiction for export'
      });
    }

    // Only citizens should be exported
    query.role = 'citizen';
    // Filter out child accounts
    query.isChild = { $ne: true };

    const citizens = await User.find(query).sort({ createdAt: -1 });

    // Build CSV
    const headers = [
      'First Name', 'Last Name', 'Email', 'Phone', 'Date of Birth', 'Gender',
      'Nationality', 'ID Number', 'Status', 'Region', 'Zone', 'Woreda', 'Kebele',
      'Registration Date'
    ];

    let csvContent = headers.join(',') + '\n';

    citizens.forEach(citizen => {
      const row = [
        citizen.personalInfo?.firstName || '',
        citizen.personalInfo?.lastName || '',
        citizen.personalInfo?.email || '',
        citizen.personalInfo?.phone || '',
        citizen.personalInfo?.dateOfBirth ? new Date(citizen.personalInfo.dateOfBirth).toLocaleDateString() : '',
        citizen.personalInfo?.gender || '',
        citizen.personalInfo?.nationality || '',
        citizen.personalInfo?.idNumber || '',
        citizen.status || '',
        citizen.location?.regionName || citizen.location?.region || '',
        citizen.location?.zoneName || citizen.location?.zone || '',
        citizen.location?.woredaName || citizen.location?.woreda || '',
        citizen.location?.kebeleName || citizen.location?.kebele || '',
        new Date(citizen.createdAt).toLocaleDateString()
      ];

      // Escape commas and quotes
      const escapedRow = row.map(val => {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });

      csvContent += escapedRow.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=citizen-records-${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csvContent);

  } catch (error) {
    console.error('Export citizens error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to export records'
    });
  }
};

// 2. Kebele/Woreda/Higher fetches pending updates
exports.getPendingUpdates = async (req, res) => {
  try {
    const userRole = req.user.role;
    const normalizedRole = roleToLevel[userRole];
    const userLoc = req.user.location || {};

    if (!normalizedRole) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized role' });
    }

    let query = {};
    const locations = [userLoc.kebele, userLoc.kebeleName, userLoc.kebeleCode,
    userLoc.woreda, userLoc.woredaName, userLoc.woredaCode,
    userLoc.zone, userLoc.zoneName, userLoc.zoneCode,
    userLoc.region, userLoc.regionName, userLoc.regionCode].filter(Boolean);

    if (normalizedRole === 'kebele') {
      const vals = [userLoc.kebele, userLoc.kebeleName, userLoc.kebeleCode].filter(Boolean);
      query = {
        'updateRequest.status': 'pending',
        $or: [
          { 'location.kebele': { $in: vals } },
          { 'location.kebeleName': { $in: vals } },
          { 'location.kebeleCode': { $in: vals } }
        ]
      };
    } else if (normalizedRole === 'woreda') {
      const vals = [userLoc.woreda, userLoc.woredaName, userLoc.woredaCode].filter(Boolean);
      query = {
        'updateRequest.status': 'kebele_approved',
        $or: [
          { 'location.woreda': { $in: vals } },
          { 'location.woredaName': { $in: vals } },
          { 'location.woredaCode': { $in: vals } }
        ]
      };
    } else if (normalizedRole === 'zone') {
      const vals = [userLoc.zone, userLoc.zoneName, userLoc.zoneCode].filter(Boolean);
      query = {
        'updateRequest.status': 'woreda_approved',
        $or: [
          { 'location.zone': { $in: vals } },
          { 'location.zoneName': { $in: vals } },
          { 'location.zoneCode': { $in: vals } }
        ]
      };
    } else if (normalizedRole === 'region') {
      const vals = [userLoc.region, userLoc.regionName, userLoc.regionCode].filter(Boolean);
      query = {
        'updateRequest.status': 'zone_approved',
        $or: [
          { 'location.region': { $in: vals } },
          { 'location.regionName': { $in: vals } },
          { 'location.regionCode': { $in: vals } }
        ]
      };
    } else if (normalizedRole === 'national') {
      query = {
        'updateRequest.status': 'region_approved'
      };
    } else {
      return res.status(403).json({ status: 'error', message: 'Access denied' });
    }

    const citizens = await User.find(query).select('personalInfo username updateRequest location');

    res.status(200).json({
      status: 'success',
      results: citizens.length,
      data: { citizens }
    });
  } catch (err) {
    console.error('Get pending updates error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// 3. Kebele reviews update
exports.reviewUpdateKebele = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { status, comments } = req.body; // 'kebele_approved' or 'rejected'

    if (!['kebele_approved', 'rejected'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status. Status must be kebele_approved or rejected' });
    }

    const citizen = await User.findById(citizenId);
    if (!citizen) return res.status(404).json({ status: 'error', message: 'Citizen not found' });

    citizen.updateRequest.status = status;
    citizen.updateRequest.kebeleReview = {
      officerName: req.user.username,
      reviewedAt: new Date(),
      comments: comments || ''
    };

    await citizen.save();

    res.status(200).json({
      status: 'success',
      message: status === 'kebele_approved' ? 'Update request approved and forwarded to Woreda' : 'Update request rejected',
      data: { citizen }
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// 4. Woreda final review & re-issuance
exports.reviewUpdateWoreda = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { status, comments } = req.body; // 'none' (for completed) or 'rejected'

    const citizen = await User.findById(citizenId);
    if (!citizen) return res.status(404).json({ status: 'error', message: 'Citizen not found' });

    if (status === 'rejected') {
      citizen.updateRequest.status = 'rejected';
      citizen.updateRequest.woredaReview = {
        officerName: req.user.username,
        reviewedAt: new Date(),
        comments: comments || ''
      };

      // Create notification for citizen
      await Notification.create({
        type: 'citizen_woreda_decision',
        recipient: citizen._id,
        sender: req.user._id,
        message: `Your profile update request was rejected by Woreda. Reason: ${comments || 'No reason provided'}`,
      });
    } else {
      // Woreda Approval: Forward to Zone instead of applying changes!
      const { pendingDetails } = citizen.updateRequest;

      citizen.updateRequest.status = 'woreda_approved';
      citizen.updateRequest.woredaReview = {
        officerName: req.user.username,
        reviewedAt: new Date(),
        comments: comments || ''
      };

      // Create notification for Zone
      const zoneRep = await User.findOne({
        role: { $in: ['zone', 'zone_representative'] },
        'location.region': citizen.location.region,
        'location.zone': citizen.location.zone
      });

      if (zoneRep) {
        await Notification.create({
          type: 'update_forwarded_to_zone',
          recipient: zoneRep._id,
          sender: req.user._id,
          message: `Profile update request from ${citizen.location.woreda} forwarded for Zone review.`,
          data: {
            updateStatus: 'woreda_approved',
            citizenId: citizen._id
          }
        });
      }
    }

    await citizen.save();

    res.status(200).json({
      status: 'success',
      message: status === 'rejected' ? 'Update rejected' : 'Update approved by Woreda and forwarded to Zone.',
      data: { citizen }
    });
  } catch (err) {
    console.error('Woreda update review error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

// Unified high-level review for Profile Updates (Zone, Region, National)
exports.reviewUpdateHighLevel = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { status, comments } = req.body;
    const user = req.user;

    const normalizedRole = roleToLevel[user.role];
    if (!normalizedRole) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized update review' });
    }

    const citizen = await User.findById(citizenId);
    if (!citizen) return res.status(404).json({ status: 'error', message: 'Citizen not found' });

    // Transition map for updates
    const transitionMap = {
      zone: { current: 'woreda_approved', next: 'zone_approved', nextRole: 'region', label: 'Region' },
      region: { current: 'zone_approved', next: 'region_approved', nextRole: 'national', label: 'National' },
      national: { current: 'region_approved', next: 'none', nextRole: null, label: 'Final' }
    };

    const transition = transitionMap[normalizedRole];

    if (citizen.updateRequest.status !== transition.current) {
      return res.status(400).json({ status: 'error', message: `Invalid status for ${normalizedRole} update review: ${citizen.updateRequest.status}` });
    }

    if (status === 'approved') {
      if (normalizedRole === 'national') {
        // FINAL APPROVAL: Apply all changes!
        const { pendingDetails } = citizen.updateRequest;

        // 1. Snapshot for history
        citizen.profileHistory.push({
          personalInfo: JSON.parse(JSON.stringify(citizen.personalInfo)),
          location: JSON.parse(JSON.stringify(citizen.location)),
          version: citizen.residentIdVersion || 1,
          updatedAt: new Date(),
          changedBy: req.user.username
        });

        // 2. Increment Version
        citizen.residentIdVersion = (citizen.residentIdVersion || 1) + 1;

        // 3. Apply changes (PersonalInfo & Location)
        if (pendingDetails.personalInfo) {
          // RESOLVE TEMPORARY IDENTITY LINKAGE (Identity Maturity Transition)
          if (citizen.identityLinkage?.is_temporary_id && pendingDetails.personalInfo.idNumber) {
            console.log(`🆔 Transitioning user ${citizen.username} from Parental Reference to Independent National ID.`);
            citizen.identityLinkage.is_temporary_id = false;
            citizen.identityLinkage.id_type = 'National ID';
            citizen.identityLinkage.reference_id = undefined;
            citizen.identityLinkage.notification_cycle_count = 0;
            
            // TRANSITION FROM CHILD TO INDEPENDENT CITIZEN
            // This ensures statistical accuracy and avoids duplicate records.
            // We EXCLUSIVELY update the existing record ID to prevent inflation of subscriber counts.
            citizen.isChild = false;
            
            // restrictions are automatically lifted because accessCheck in vitalEventController uses is_temporary_id flag
          }

          citizen.personalInfo = { ...citizen.personalInfo.toObject(), ...pendingDetails.personalInfo };

          // Sync Birth Certificate if name changed
          if (pendingDetails.personalInfo.firstName || pendingDetails.personalInfo.lastName) {
            await VitalEvent.findOneAndUpdate(
              { citizen: citizen._id, type: 'birth' },
              { 'birthDetails.childName': `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}` }
            );
          }
        }
        if (pendingDetails.location) {
          citizen.location = { ...citizen.location.toObject(), ...pendingDetails.location };
        }

        // 4. Update photo if provided
        if (pendingDetails.profilePhoto) {
          citizen.profilePhoto = pendingDetails.profilePhoto;
          citizen.personalInfo.photo = pendingDetails.profilePhoto;
        }

        citizen.updateRequest.status = 'none';
        citizen.updateRequest.pendingDetails = undefined;
        citizen.certificatePayment.status = 'pending'; // Lock for re-issuance payment

        // Notify Citizen
        await Notification.create({
          type: 'citizen_update_finalized',
          recipient: citizen._id,
          message: `Your profile update has been finalized by National office. Version ${citizen.residentIdVersion} is now ready for download after payment.`
        });
      } else {
        citizen.updateRequest.status = transition.next;
        // Notify next level
        const nextRepQuery = { role: transition.nextRole };
        if (transition.nextRole !== 'national') {
          nextRepQuery['location.region'] = citizen.location.region;
        }
        const nextRep = await User.findOne(nextRepQuery);
        if (nextRep) {
          await Notification.create({
            type: 'update_forwarded',
            recipient: nextRep._id,
            message: `Profile update for ${citizen.personalInfo.firstName} forwarded to ${transition.label} for review.`
          });
        }
      }
    } else {
      citizen.updateRequest.status = 'rejected';
      // Notify Citizen
      await Notification.create({
        type: 'update_rejected',
        recipient: citizen._id,
        message: `Your profile update was rejected by ${normalizedRole}. Reason: ${comments || 'No reason provided'}`
      });
    }

    await citizen.save();
    res.status(200).json({ status: 'success', message: `${normalizedRole} update review completed`, data: { citizen } });

  } catch (error) {
    console.error('High-level update review error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Get citizen registration statistics for kebele dashboard
exports.getCitizenStats = async (req, res) => {
  try {
    const kebeleRep = req.user;

    if (!isKebeleRole(kebeleRep.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can access this endpoint'
      });
    }

    const kebeleName = kebeleRep.location.kebele;

    const totalCitizens = await User.countDocuments({
      role: 'citizen',
      'location.kebele': kebeleName
    });

    const pendingCitizens = await User.countDocuments({
      role: 'citizen',
      'location.kebele': kebeleName,
      isApproved: false,
      status: 'pending_verification'
    });

    const approvedCitizens = await User.countDocuments({
      role: 'citizen',
      'location.kebele': kebeleName,
      isApproved: true
    });

    const rejectedCitizens = await User.countDocuments({
      role: 'citizen',
      'location.kebele': kebeleName,
      status: 'rejected'
    });

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          total: totalCitizens,
          pending: pendingCitizens,
          approved: approvedCitizens,
          rejected: rejectedCitizens,
          kebele: kebeleName
        }
      }
    });
  } catch (error) {
    console.error('Get citizen stats error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Special endpoint for creating National Representative
exports.createNationalRepresentative = async (req, res) => {
  try {
    const { username, password, personalInfo, officeInfo } = req.body;

    // Check if national already exists
    const existingNational = await User.findOne({ role: 'national' });
    if (existingNational) {
      return res.status(400).json({
        status: 'error',
        message: 'National Representative already exists in the system'
      });
    }

    const safePersonalInfo = {
      firstName: personalInfo?.firstName || 'NATIONAL',
      lastName: personalInfo?.lastName || 'OFFICE',
      email: personalInfo?.email || '',
      phone: personalInfo?.phone || '',
      idNumber: personalInfo?.idNumber || ''
    };

    const userData = {
      username,
      password,
      role: 'national',
      personalInfo: safePersonalInfo,
      officeInfo,
      isActive: true,
      isApproved: true
    };

    const newUser = await User.create(userData);

    res.status(201).json({
      status: 'success',
      message: 'National Representative created successfully',
      data: {
        user: {
          id: newUser._id,
          username: newUser.username,
          role: newUser.role,
          personalInfo: newUser.personalInfo
        }
      }
    });

  } catch (error) {
    console.error('Create national representative error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// FIXED: Get ALL citizens for kebele (not just pending)
exports.getKebeleCitizens = async (req, res) => {
  try {
    const kebeleRep = req.user;

    if (!isKebeleRole(kebeleRep.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can access this endpoint'
      });
    }

    const jurisdictionQuery = buildJurisdictionQuery(kebeleRep.location, kebeleRep.role);
    console.log(`🔍 Fetching ALL citizens for jurisdiction:`, JSON.stringify(jurisdictionQuery));

    // Get ALL citizens from this kebele jurisdiction (Shared path)
    const citizens = await User.find({
      ...jurisdictionQuery,
      role: 'citizen'
    })
      .select('-password -__v')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Found ${citizens.length} total citizens in ${kebeleRep.location.kebele || 'Jurisdiction'}`);
    // Filter out any test data
    const realCitizens = citizens.filter(citizen => {
      // Skip obvious test names
      const testNames = ['test', 'demo', 'example', 'sample', 'melkamu', 'abebe'];
      const firstName = citizen.personalInfo?.firstName?.toLowerCase() || '';
      const lastName = citizen.personalInfo?.lastName?.toLowerCase() || '';

      return !testNames.some(testName =>
        firstName.includes(testName) || lastName.includes(testName)
      );
    });
    console.log(`📊 After filtering, ${realCitizens.length} real citizens remain in ${kebeleRep.location.kebele || 'Jurisdiction'}`);
    // Group by status for frontend
    const groupedCitizens = {
      pending: realCitizens.filter(c => !c.isApproved && ['pending', 'pending_verification'].includes(c.status)),
      approved: realCitizens.filter(c => c.isApproved),
      rejected: realCitizens.filter(c => c.status === 'rejected'),
      all: realCitizens
    };

    res.status(200).json({
      status: 'success',
      data: {
        citizens: realCitizens,
        grouped: groupedCitizens,
        counts: {
          total: realCitizens.length,
          pending: groupedCitizens.pending.length,
          approved: groupedCitizens.approved.length,
          rejected: groupedCitizens.rejected.length
        },
        kebele: kebeleRep.location.kebele
      }
    });
  } catch (error) {
    console.error('Get kebele citizens error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch citizen records'
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password, category, level } = req.body;

    if (!username || !password || !category) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide username, password, and category'
      });
    }

    const user = await User.findOne({ username }).select('+password');

    if (!user || !(await user.correctPassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect username or password'
      });
    }

    // Category Validation
    const userCategory = user.role === 'citizen' ? 'Citizen' : 'Representative';
    if (category !== userCategory) {
      return res.status(401).json({
        status: 'error',
        message: `Authentication failed. You are registered as a ${userCategory}, but selected ${category}.`
      });
    }

    // Representation Level Validation for Representatives
    if (category === 'Representative') {
      if (!level) {
        return res.status(400).json({
          status: 'error',
          message: 'Please select your representation level'
        });
      }

      const normalizedUserRole = roleToLevel[user.role] || user.role;
      // Map frontend level labels to backend roles if necessary
      const levelToRoleMap = {
        'Kebele': 'kebele',
        'Wereda': 'woreda',
        'Zone': 'zone',
        'Region': 'region',
        'National': 'national'
      };

      const selectedLevel = levelToRoleMap[level] || level.toLowerCase();
      
      if (normalizedUserRole !== selectedLevel) {
        return res.status(401).json({
          status: 'error',
          message: `Administrative level mismatch. You are registered at the ${normalizedUserRole} level, but selected ${level}.`
        });
      }
    }

    if (user.isActive === false && user.role !== 'citizen') {
      return res.status(401).json({
        status: 'error',
        message: 'Your account is not active. Please contact your supervisor for activation.'
      });
    }

    if (user.identityLinkage?.is_banned) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been permanently banned due to failure to update your National ID after identity maturity.'
      });
    }

    // REAL-TIME MATURITY ENFORCEMENT
    if (user.identityLinkage?.is_temporary_id && user.role === 'citizen') {
      const now = new Date();
      const sixYearsInMs = 6 * 365.25 * 24 * 60 * 60 * 1000;
      const registrationAgeInMs = now - user.createdAt;

      if (registrationAgeInMs >= sixYearsInMs || (user.identityLinkage.notification_cycle_count || 0) >= 12) {
        console.log(`🚫 Banning user ${user.username} during login due to identity maturity non-compliance.`);
        await identityLinkageService.enforceHardStop(user);
        return res.status(403).json({
          status: 'error',
          message: 'Your account has been permanently terminated as the 6-year grace period for updating your National ID has expired.'
        });
      }
    }

    // Attach maturity status for frontend
    const maturityStatus = identityLinkageService.getMaturityStatus(user);
    user._doc.maturityStatus = maturityStatus; // Attach temporarily to doc for createSendToken

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Helper function to check role creation permissions
const canCreateRole = (creatorRole, targetRole) => {
  const creationHierarchy = {
    'national': ['region'],
    'region': ['zone'],
    'zone': ['woreda'],
    'woreda': ['kebele'],
    'kebele': [],
    'citizen': []
  };

  return creationHierarchy[creatorRole]?.includes(targetRole) || false;
};

const isKebeleRole = (role) => role === 'kebele' || role === 'kebele_representative';

// Kebele: Approve citizen
exports.approveCitizen = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { verificationNotes, comments, officerName } = req.body;
    const effectiveComments = comments || verificationNotes || '';
    const kebeleRep = req.user;

    console.log(`✅ Kebele rep ${kebeleRep.username} attempting to approve citizen: ${citizenId}`);

    if (!isKebeleRole(kebeleRep.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can approve citizens'
      });
    }

    const citizen = await User.findById(citizenId);

    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'Citizen not found'
      });
    }

    // Robust Kebele comparison (check Name and Code)
    const repKebele = kebeleRep.location?.kebele || '';
    const repKebeleCode = kebeleRep.location?.kebeleCode || '';

    const citizenKebele = citizen.location?.kebele || '';
    const citizenKebeleCode = citizen.location?.kebeleCode || '';

    const matches = (repKebele && (repKebele === citizenKebele || repKebele === citizenKebeleCode)) ||
      (repKebeleCode && (repKebeleCode === citizenKebele || repKebeleCode === citizenKebeleCode));

    if (!matches && repKebele.toLowerCase() !== citizenKebele.toLowerCase()) {
      console.log(`❌ Kebele mismatch: Citizen is in ${citizenKebele}/${citizenKebeleCode}, Rep is in ${repKebele}/${repKebeleCode}`);
      return res.status(403).json({
        status: 'error',
        message: `You can only approve citizens from your assigned kebele. Citizen is in ${citizenKebele || 'Unknown Kebele'}, you are responsible for ${repKebele || 'Unknown Kebele'}`
      });
    }


    // Check if already approved
    if (citizen.isApproved) {
      return res.status(400).json({
        status: 'error',
        message: 'Citizen is already approved'
      });
    }

    // Process uploaded files (Seal & Signature)
    let sealData = null;
    let signatureData = null;

    if (req.files) {
      if (req.files.seal && req.files.seal[0]) {
        sealData = {
          url: `/uploads/verification/${req.files.seal[0].filename}`,
          filename: req.files.seal[0].filename
        };
      }
      if (req.files.signature && req.files.signature[0]) {
        signatureData = {
          url: `/uploads/verification/${req.files.signature[0].filename}`,
          filename: req.files.signature[0].filename
        };
      }
    }

    // Store verification details
    citizen.kebeleVerification = {
      officerName: officerName || (kebeleRep.personalInfo ? `${kebeleRep.personalInfo.firstName} ${kebeleRep.personalInfo.lastName}` : kebeleRep.username),
      seal: sealData,
      signature: signatureData,
      approvedAt: new Date()
    };

    // Update citizen status - Forward to woreda instead of final approval
    citizen.isApproved = true; // Kebele has approved, but needs woreda final approval
    citizen.isActive = false; // Not active until woreda approves
    citizen.idVerified = true;
    citizen.status = 'pending_woreda'; // Changed from 'verified' to 'pending_woreda'
    citizen.verificationNotes = effectiveComments || 'Approved by kebele representative, pending woreda final approval';
    citizen.approvedBy = kebeleRep._id;
    citizen.kebeleApprovalDate = new Date(); // Track when kebele approved
    citizen.updatedAt = new Date();

    // Verify all documents
    if (citizen.documents && citizen.documents.length > 0) {
      citizen.documents.forEach(doc => doc.verified = true);
    }
    if (citizen.profilePhoto) {
      citizen.profilePhoto.verified = true;
    }

    await citizen.save();

    const citizenFullName = citizen.personalInfo ? `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}` : (citizen.username || 'Citizen');
    console.log(`✅ Citizen ${citizenFullName} approved by ${kebeleRep.username} with verification data`);

    // Create approval notification for citizen
    try {
      await Notification.create({
        type: 'citizen_approved',
        recipient: citizen._id,
        sender: kebeleRep._id,
        data: {
          approvedBy: citizen.kebeleVerification?.officerName,
          approvedAt: new Date(),
          kebele: citizen.location?.kebele,
          verificationNotes: effectiveComments
        },
        message: `Your account has been approved by kebele representative and forwarded to woreda for final approval.`,
        read: false
      });
      console.log(`📨 Approval notification created for citizen`);

      // ALSO: Notify Woreda Representative
      const woredaRep = await User.findOne({
        role: { $in: ['woreda', 'woreda_representative'] },
        'location.woreda': citizen.location?.woreda,
        'location.zone': citizen.location?.zone,
        'location.region': citizen.location?.region
      });

      if (woredaRep) {
        await Notification.create({
          type: 'citizen_woreda_review',
          recipient: woredaRep._id,
          sender: kebeleRep._id,
          message: `New citizen registration forwarded from kebele for woreda review: ${citizenFullName}`,
          data: {
            citizenId: citizen._id,
            citizenName: citizenFullName,
            location: citizen.location?.woreda,
            kebele: citizen.location?.kebele,
            approvedByKebele: kebeleRep._id,
            approvalDate: new Date()
          },
          read: false
        });
        console.log(`📨 Woreda representative ${woredaRep.username} notified about citizen approval`);
      }
    } catch (notifError) {
      console.error('Failed to create notifications:', notifError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Citizen approved and forwarded to woreda for final approval',
      data: {
        citizen: {
          id: citizen._id,
          name: citizen.personalInfo ? `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}` : citizen.username,
          status: citizen.status,
          kebele: citizen.location?.kebele,
          kebeleVerification: citizen.kebeleVerification
        }
      }
    });
  } catch (error) {
    console.error('Approve citizen error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};
// Get citizen by ID (for review details)
exports.getCitizenById = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const kebeleRep = req.user;

    if (!isKebeleRole(kebeleRep.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }
    const citizen = await User.findById(citizenId)
      .select('-password -__v');

    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'Citizen not found'
      });
    }
    // Verify kebele match
    const citizenKebeleMatch = (citizen.location?.kebele || '').toLowerCase();
    const repKebeleMatch = (kebeleRep.location?.kebele || '').toLowerCase();

    if (citizenKebeleMatch !== repKebeleMatch) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only view citizens from your kebele'
      });
    }
    res.status(200).json({
      status: 'success',
      data: { citizen }
    });
  } catch (error) {
    console.error('Get citizen error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch citizen details'
    });
  }
};


// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const kebeleRep = req.user;

    if (!isKebeleRole(kebeleRep.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    const kebeleName = kebeleRep.location.kebele;
    // Get counts for different statuses
    const [
      totalCitizens,
      pendingCitizens,
      approvedCitizens,
      rejectedCitizens,
      totalEvents,
      pendingEvents
    ] = await Promise.all([
      User.countDocuments({
        role: 'citizen',
        'location.kebele': kebeleName
      }),
      User.countDocuments({
        role: 'citizen',
        'location.kebele': kebeleName,
        isApproved: false,
        status: 'pending_verification'
      }),
      User.countDocuments({
        role: 'citizen',
        'location.kebele': kebeleName,
        isApproved: true
      }),
      User.countDocuments({
        role: 'citizen',
        'location.kebele': kebeleName,
        status: 'rejected'
      }),
      VitalEvent.countDocuments({
        'location.kebele': kebeleName
      }),
      VitalEvent.countDocuments({
        'location.kebele': kebeleName,
        status: 'pending'
      })
    ]);
    // Calculate approval rate
    const approvalRate = totalCitizens > 0
      ? Math.round((approvedCitizens / totalCitizens) * 100)
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          citizens: {
            total: totalCitizens,
            pending: pendingCitizens,
            approved: approvedCitizens,
            rejected: rejectedCitizens,
            approvalRate: `${approvalRate}%`
          },
          events: {
            total: totalEvents,
            pending: pendingEvents
          },
          kebele: kebeleName,
          lastUpdated: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch dashboard statistics'
    });
  }
};

// Clean database from test data
exports.cleanTestData = async (req, res) => {
  try {
    // Only admins can clean data
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only administrators can clean test data'
      });
    }

    const testNames = ['test', 'demo', 'example', 'sample', 'melkamu', 'abebe'];

    // Build query for test users
    const testQuery = {
      $or: testNames.map(name => ({
        $or: [
          { 'personalInfo.firstName': { $regex: name, $options: 'i' } },
          { 'personalInfo.lastName': { $regex: name, $options: 'i' } },
          { username: { $regex: name, $options: 'i' } }
        ]
      }))
    };
    // Delete test users
    const result = await User.deleteMany(testQuery);

    console.log(`🧹 Cleaned ${result.deletedCount} test users from database`);

    res.status(200).json({
      status: 'success',
      message: `Cleaned ${result.deletedCount} test records from database`,
      data: result
    });
  } catch (error) {
    console.error('Clean test data error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clean test data'
    });
  }
};
// Kebele: Reject citizen
exports.rejectCitizen = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { reason } = req.body;
    const kebeleRep = req.user;

    console.log(`❌ Kebele rep ${kebeleRep.username} attempting to reject citizen: ${citizenId}`);

    if (!isKebeleRole(kebeleRep.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can reject citizens'
      });
    }

    const citizen = await User.findById(citizenId);

    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'Citizen not found'
      });
    }

    // Check if citizen belongs to this kebele rep's kebele
    const citizenKebele = (citizen.location?.kebele || '').toLowerCase();
    const repKebele = (kebeleRep.location?.kebele || '').toLowerCase();

    if (citizenKebele !== repKebele) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only reject citizens from your assigned kebele'
      });
    }

    if (!reason) {
      return res.status(400).json({
        status: 'error',
        message: 'Rejection reason is required'
      });
    }

    // Update citizen status
    citizen.isApproved = false;
    citizen.isActive = false;
    citizen.idVerified = false;
    citizen.status = 'rejected';
    citizen.verificationNotes = reason;
    citizen.rejectedBy = kebeleRep._id;
    citizen.rejectedAt = new Date();
    citizen.updatedAt = new Date();

    await citizen.save();

    console.log(`❌ Citizen ${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName} rejected by ${kebeleRep.username}`);

    // Create rejection notification
    try {
      const notification = await Notification.create({
        type: 'citizen_rejected',
        recipient: citizen._id,
        sender: kebeleRep._id,
        data: {
          rejectedBy: kebeleRep.personalInfo?.firstName ?
            `${kebeleRep.personalInfo.firstName} ${kebeleRep.personalInfo.lastName}` :
            kebeleRep.username,
          rejectedAt: new Date(),
          reason: reason
        },
        message: `Your registration was rejected by kebele representative. Reason: ${reason}`,
        read: false
      });
      console.log(`📨 Rejection notification created for citizen`);
    } catch (notifError) {
      console.error('Failed to create rejection notification:', notifError);
    }

    res.status(200).json({
      status: 'success',
      message: 'Citizen rejected successfully',
      data: {
        citizen: {
          id: citizen._id,
          name: `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}`,
          status: citizen.status,
          reason: reason
        }
      }
    });
  } catch (error) {
    console.error('Reject citizen error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get citizen registrations that need woreda approval
exports.getCitizensForWoredaReview = async (req, res) => {
  try {
    const user = req.user;

    console.log('🔍 Woreda representative requesting citizens for review:', {
      role: user.role,
      location: user.location
    });

    // Only woreda representatives can access this
    if (!['woreda', 'woreda_representative'].includes(user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only woreda representatives can access this endpoint'
      });
    }

    // Get ALL citizens in this woreda (pending, approved, rejected)
    const citizens = await User.find({
      role: 'citizen',
      $or: [
        { 'location.woreda': user.location.woreda },
        { 'location.woredaName': user.location.woreda }
      ]
    }).select('personalInfo location status verificationLevel createdAt verificationHistory familyMembers kebeleApprovalDate isActive approvedAt rejectedAt woredaApprovalDate kebeleVerification profilePhoto documents idCard');

    console.log(`📊 Found ${citizens.length} citizens for woreda review in ${user.location.woreda}`);

    res.status(200).json({
      status: 'success',
      results: citizens.length,
      data: {
        citizens
      }
    });
  } catch (error) {
    console.error('Get citizens for woreda review error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Woreda reviews citizen registration
exports.reviewCitizenAtWoreda = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { status, comments, officerName } = req.body;
    const user = req.user;

    // Only woreda representatives can review citizens at woreda level
    if (!['woreda', 'woreda_representative'].includes(user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only woreda representatives can review citizens at woreda level'
      });
    }

    const citizen = await User.findById(citizenId);

    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'Citizen not found'
      });
    }

    // Check if citizen is in the same woreda
    const citizenWoreda = citizen.location?.woreda || '';
    const citizenWoredaName = citizen.location?.woredaName || '';
    const userWoreda = user.location?.woreda || '';

    if (citizenWoreda !== userWoreda && citizenWoredaName !== userWoreda) {
      return res.status(403).json({
        status: 'error',
        message: 'Citizen is not in your assigned woreda'
      });
    }

    // Update citizen status
    if (status === 'approved') {
      citizen.status = 'approved';
      citizen.verificationLevel = 'verified';
      citizen.isActive = true; // Make citizen active after woreda approval
      citizen.approvedAt = new Date(); // Set final approval date

      // Handle Woreda Verification Details
      citizen.woredaVerification = {
        officerName,
        approvedAt: new Date()
      };

      // Process uploaded files if any
      if (req.files) {
        if (req.files['seal'] && req.files['seal'][0]) {
          citizen.woredaVerification.seal = {
            url: `/uploads/verification/${req.files['seal'][0].filename}`,
            filename: req.files['seal'][0].filename
          };
        }
        if (req.files['signature'] && req.files['signature'][0]) {
          citizen.woredaVerification.signature = {
            url: `/uploads/verification/${req.files['signature'][0].filename}`,
            filename: req.files['signature'][0].filename
          };
        }
        if (req.files['idCard'] && req.files['idCard'][0]) {
          citizen.woredaVerification.idCard = {
            url: `/uploads/verification/${req.files['idCard'][0].filename}`,
            filename: req.files['idCard'][0].filename
          };
        }
        if (req.files['documents']) {
          citizen.woredaVerification.documents = req.files['documents'].map(file => ({
            url: `/uploads/verification/${file.filename}`,
            filename: file.filename,
            type: 'supporting_document'
          }));
        }
      }
    } else {
      citizen.status = 'rejected_woreda'; // More specific status for woreda rejection
      citizen.verificationLevel = 'unverified';
      citizen.isActive = false;
    }
    citizen.verifiedBy = user._id;
    citizen.verificationDate = new Date();
    citizen.woredaApprovalDate = new Date(); // Track woreda approval/rejection date

    // Add verification record
    citizen.verificationHistory = citizen.verificationHistory || [];
    citizen.verificationHistory.push({
      verifiedBy: user._id,
      level: 'woreda',
      status,
      comments,
      verifiedAt: new Date()
    });

    await citizen.save();

    // Notify citizen about their status
    await Notification.create({
      type: 'citizen_woreda_verification',
      recipient: citizen._id,
      sender: user._id,
      message: status === 'approved'
        ? `Your citizen registration has been fully approved by woreda representative. You can now login and submit vital events.`
        : `Your citizen registration was rejected by woreda representative. Reason: ${comments || 'No reason provided'}`,
      data: {
        status,
        verifiedBy: user._id,
        verificationDate: new Date(),
        level: 'woreda'
      }
    });

    // Send approval email notification
    if (status === 'approved') {
      try {
        const emailResult = await sendApprovalEmail(citizen);
        console.log(`📧 Approval email result for ${citizen.personalInfo?.email}:`, emailResult);
      } catch (emailErr) {
        console.error('⚠️ Email notification failed (non-blocking):', emailErr.message);
      }
    }

    res.status(200).json({
      status: 'success',
      message: `Citizen ${status} successfully at woreda level`,
      data: {
        citizen: {
          id: citizen._id,
          name: `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}`,
          status: citizen.status,
          verificationLevel: citizen.verificationLevel
        }
      }
    });
  } catch (error) {
    console.error('Review citizen at woreda error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};



// Resubmit rejected citizen registration
exports.resubmitCitizen = async (req, res) => {
  try {
    const user = req.user;

    // Only citizens can resubmit
    if (user.role !== 'citizen') {
      return res.status(403).json({
        status: 'error',
        message: 'Only citizens can resubmit registration'
      });
    }

    // Only rejected citizens can resubmit
    if (user.status !== 'rejected') {
      return res.status(400).json({
        status: 'error',
        message: 'Only rejected registrations can be resubmitted'
      });
    }

    console.log(`📝 Resubmitting registration for citizen: ${user._id}`);
    console.log('Request body:', req.body);

    // Updates object
    // Handle attributes update manually to ensure nested objects are handled
    const pInfo = req.body.personalInfo || {};

    // Update personal info if provided
    if (pInfo.firstName) user.personalInfo.firstName = pInfo.firstName;
    if (pInfo.lastName) user.personalInfo.lastName = pInfo.lastName;
    if (pInfo.phone) user.personalInfo.phone = pInfo.phone;
    if (pInfo.dateOfBirth) user.personalInfo.dateOfBirth = pInfo.dateOfBirth;
    if (pInfo.gender) user.personalInfo.gender = pInfo.gender;
    if (pInfo.maritalStatus) user.personalInfo.maritalStatus = pInfo.maritalStatus;
    if (pInfo.occupation) user.personalInfo.occupation = pInfo.occupation;
    if (pInfo.educationLevel) user.personalInfo.educationLevel = pInfo.educationLevel;
    if (pInfo.idNumber) user.personalInfo.idNumber = pInfo.idNumber;
    if (pInfo.email !== undefined) user.personalInfo.email = pInfo.email;

    // Handle flat fields if they come from formData
    if (req.body['personalInfo.firstName']) user.personalInfo.firstName = req.body['personalInfo.firstName'];
    if (req.body['personalInfo.lastName']) user.personalInfo.lastName = req.body['personalInfo.lastName'];
    if (req.body['personalInfo.phone']) user.personalInfo.phone = req.body['personalInfo.phone'];
    if (req.body['personalInfo.idNumber']) user.personalInfo.idNumber = req.body['personalInfo.idNumber'];

    // Update location if provided
    let locData = req.body.location;
    if (typeof locData === 'string') {
      try {
        locData = JSON.parse(locData);
      } catch (e) {
        locData = {};
      }
    }

    const buildJurisdictionQuery = (user) => {
      const { role, location } = user;
      const query = {};

      if (role === 'national') return query;

      const normalizedRole = role.split('_')[0]; // kebele, woreda, zone, region

      // Hierarchical query building
      if (location) {
        if (normalizedRole === 'region' || normalizedRole === 'zone' || normalizedRole === 'woreda' || normalizedRole === 'kebele') {
          const regionVal = location.region || location.regionName;
          if (regionVal) {
            query.$or = query.$or || [];
            query.$or.push({ 'location.region': regionVal }, { 'location.regionName': regionVal });
          }
        }

        if (normalizedRole === 'zone' || normalizedRole === 'woreda' || normalizedRole === 'kebele') {
          const zoneVal = location.zone || location.zoneName;
          if (zoneVal) {
            query.$and = query.$and || [];
            query.$and.push({
              $or: [
                { 'location.zone': zoneVal },
                { 'location.zoneName': zoneVal }
              ]
            });
          }
        }

        if (normalizedRole === 'woreda' || normalizedRole === 'kebele') {
          const woredaVal = location.woreda || location.woredaName;
          if (woredaVal) {
            query.$and = query.$and || [];
            query.$and.push({
              $or: [
                { 'location.woreda': woredaVal },
                { 'location.woredaName': woredaVal }
              ]
            });
          }
        }

        if (normalizedRole === 'kebele') {
          const kebeleVal = location.kebele || location.kebeleName || location.kebeleCode;
          if (kebeleVal) {
            query.$and = query.$and || [];
            query.$and.push({
              $or: [
                { 'location.kebele': kebeleVal },
                { 'location.kebeleName': kebeleVal },
                { 'location.kebeleCode': kebeleVal }
              ]
            });
          }
        }
      }

      return query;
    };
    if (locData && Object.keys(locData).length > 0) {
      if (locData.region) user.location.region = locData.region;
      if (locData.zone) user.location.zone = locData.zone;
      if (locData.woreda) user.location.woreda = locData.woreda;
      if (locData.kebele) user.location.kebele = locData.kebele;

      if (locData.regionName) user.location.regionName = locData.regionName;
      if (locData.zoneName) user.location.zoneName = locData.zoneName;
      if (locData.woredaName) user.location.woredaName = locData.woredaName;
      if (locData.kebeleName) user.location.kebeleName = locData.kebeleName;
    }

    // Handle file uploads (replace existing)
    if (req.files) {
      if (req.files.profilePhoto) {
        const file = req.files.profilePhoto[0];
        const photoUrl = `/uploads/${file.filename}`;

        user.profilePhoto = {
          url: photoUrl,
          filename: file.filename,
          originalName: file.originalname,
          uploadedAt: new Date(),
          verified: false
        };
        // Also update personalInfo.photo
        user.personalInfo.photo = {
          url: photoUrl,
          filename: file.filename,
          uploadedAt: new Date()
        };
      }

      if (req.files.idCard) {
        const file = req.files.idCard[0];
        user.idCard = {
          url: `/uploads/${file.filename}`,
          filename: file.filename,
          originalName: file.originalname,
          uploadedAt: new Date(),
          verified: false
        };
      }

      if (req.files.documents) {
        // Replace documents entirely if new ones provided
        user.documents = req.files.documents.map(doc => ({
          type: 'document',
          url: `/uploads/${doc.filename}`,
          filename: doc.filename,
          originalName: doc.originalname,
          uploadedAt: new Date(),
          verified: false
        }));
      }
    }

    if (req.body.familyMembers) {
      try {
        const fam = JSON.parse(req.body.familyMembers);
        if (Array.isArray(fam)) {
          user.familyMembers = fam;
        }
      } catch (e) {
        console.error('Error parsing family members', e);
      }
    }

    // Reset status to pending
    user.status = 'pending';
    user.isApproved = false;
    user.isActive = false;
    user.idVerified = false;

    // Clear rejection info
    user.rejectedBy = undefined;
    user.rejectedAt = undefined;

    // Save old rejection reason in history or clear it?
    // Let's prepend it to verificationNotes so history is kept
    if (user.verificationNotes) {
      user.verificationNotes = `Resubmitted. Previous note: ${user.verificationNotes}`;
    } else {
      user.verificationNotes = 'Resubmitted by citizen';
    }
    user.reviewComments = ''; // Clear review comments

    user.updatedAt = new Date();

    await user.save();

    console.log(`✅ Citizen ${user._id} resubmitted successfully`);

    // Create notification for Kebele?
    // Ideally yes, notify Kebele that a citizen resubmitted.
    const kebeleRep = await findKebeleRepresentative(user.location.kebele);
    if (kebeleRep) {
      await createKebeleNotification(user, kebeleRep);
    }

    res.status(200).json({
      status: 'success',
      message: 'Registration resubmitted successfully. It is now pending Kebele review.',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Resubmit citizen error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to resubmit registration'
    });
  }
};

// ==================== FORGOT PASSWORD ====================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide your email address'
      });
    }

    // Find user by email (case-insensitive and trimmed)
    const user = await User.findOne({
      'personalInfo.email': { $regex: new RegExp(`^${email.trim()}$`, 'i') }
    });

    if (!user) {
      // Don't reveal whether user exists for security
      return res.status(200).json({
        status: 'success',
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // Send email
    const emailResult = await sendPasswordResetEmail(user, resetToken);

    if (emailResult.success) {
      console.log(`✅ Password reset email sent to ${email}`);
    } else {
      console.error(`❌ Failed to send reset email: ${emailResult.reason}`);
      // Clear token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        status: 'error',
        message: 'Failed to send password reset email. Please try again later.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred. Please try again later.'
    });
  }
};

// ==================== RESET PASSWORD ====================
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Hash the token from the URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid (non-expired) reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Reset token is invalid or has expired. Please request a new password reset.'
      });
    }

    // Update password and clear reset fields
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log(`✅ Password reset successful for user: ${user.username}`);

    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred. Please try again later.'
    });
  }
};