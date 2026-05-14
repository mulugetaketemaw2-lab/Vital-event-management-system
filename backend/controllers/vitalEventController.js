const VitalEvent = require('../models/VitalEvent');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { notify, notifyLocationReps } = require('../utils/notificationHelper');
const path = require('path');
const fs = require('fs');
const { locationMapping, getRegex, convertLocationCodesToNames, convertLocationNamesToCodes, validateLocationHierarchy, buildJurisdictionQuery } = require('../utils/locationHelper');
const { sendEventApprovalEmail } = require('../utils/emailService');
const identityLinkageService = require('../services/identityLinkageService');
// Redundant require removed
// ==================== LOCATION HELPER FUNCTIONS ====================

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

// ==================== CITIZEN REGISTRATION ====================

exports.registerCitizen = async (req, res) => {
  try {
    const { personalInfo, familyMembers, password } = req.body;

    // Check if citizen already exists
    const existingUser = await User.findOne({
      $or: [
        { 'personalInfo.email': personalInfo.email },
        { 'personalInfo.phone': personalInfo.phone }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email or phone already exists'
      });
    }

    // Convert citizen's location codes to names
    const citizenLocation = convertLocationCodesToNames(personalInfo.currentAddress);

    console.log('ðŸ“ Citizen location converted:', {
      original: personalInfo.currentAddress,
      converted: citizenLocation
    });

    // Create citizen with "pending" status
    const citizen = await User.create({
      personalInfo: {
        ...personalInfo,
        currentAddress: citizenLocation // Store with proper names
      },
      familyMembers: familyMembers || [],
      password,
      role: 'citizen',
      status: 'pending',
      location: citizenLocation, // Store location with names
      verificationLevel: 'unverified'
    });

    // 1. NOTIFY KEBELE REPRESENTATIVE
    // Find kebele representative for this location
    const kebeleRep = await User.findOne({
      role: 'kebele_representative',
      'location.kebele': citizenLocation.kebele
    });

    if (kebeleRep) {
      await Notification.create({
        type: 'new_citizen_registration',
        recipient: kebeleRep._id,
        sender: citizen._id,
        message: `New citizen registration from ${personalInfo.firstName} ${personalInfo.lastName}`,
        data: {
          citizenId: citizen._id,
          citizenName: `${personalInfo.firstName} ${personalInfo.lastName}`,
          location: citizenLocation.kebele
        },
        read: false
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Citizen registration submitted. Waiting for kebele approval.',
      data: {
        citizen: {
          id: citizen._id,
          firstName: citizen.personalInfo.firstName,
          lastName: citizen.personalInfo.lastName,
          status: citizen.status
        }
      }
    });
  } catch (error) {
    console.error('Citizen registration error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ==================== CREATE VITAL EVENT ====================

exports.createVitalEvent = async (req, res) => {
  try {
    const { type, eventDate, ...details } = req.body;

    // Validate date is not in the future
    if (eventDate && new Date(eventDate) > new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'Event date cannot be in the future.'
      });
    }

    // Validate event type
    const validTypes = ['birth', 'death', 'marriage'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid event type. Must be birth, death, or marriage.'
      });
    }

    // Validate event date is provided
    if (!eventDate) {
      return res.status(400).json({
        status: 'error',
        message: 'Event date is required.'
      });
    }

    console.log('📝 Creating vital event for user:', {
      userId: req.user.id,
    });

    // Check if citizen is active
    if (!req.user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is not active. You cannot register vital events until your account is approved.'
      });
    }

    // IDENTITY MATURITY ACCESS BLOCKING
    const accessCheck = await identityLinkageService.checkServiceAccess(req.user, `${type}_registration`);
    if (!accessCheck.allowed) {
      return res.status(403).json({
        status: 'error',
        message: accessCheck.message,
        showUpdateModal: true // Signal to frontend to show the modal
      });
    }

    console.log('📝 Creating vital event for user:', {
      userId: req.user.id,
      userLocation: req.user.location,
      files: req.files ? Object.keys(req.files) : 'No files'
    });

    // Handle files
    let fileData = {
      birthDetails: {},
      deathDetails: {},
      marriageDetails: {}
    };

    if (req.files) {
      const BASE_Path = '/uploads/events/'; // URL path relative to server root

      if (req.files.childPhoto) {
        fileData.birthDetails.childPhoto = {
          url: BASE_Path + req.files.childPhoto[0].filename,
          filename: req.files.childPhoto[0].filename
        };
      }
      if (req.files.fatherPhoto) {
        if (!fileData.birthDetails.parentPhotos) fileData.birthDetails.parentPhotos = {};
        fileData.birthDetails.parentPhotos.father = {
          url: BASE_Path + req.files.fatherPhoto[0].filename,
          filename: req.files.fatherPhoto[0].filename
        };
      }
      if (req.files.motherPhoto) {
        if (!fileData.birthDetails.parentPhotos) fileData.birthDetails.parentPhotos = {};
        fileData.birthDetails.parentPhotos.mother = {
          url: BASE_Path + req.files.motherPhoto[0].filename,
          filename: req.files.motherPhoto[0].filename
        };
      }

      if (req.files.deceasedPhoto) {
        fileData.deathDetails.deceasedPhoto = {
          url: BASE_Path + req.files.deceasedPhoto[0].filename,
          filename: req.files.deceasedPhoto[0].filename
        };
      }

      if (req.files.husbandPhoto) {
        fileData.marriageDetails.husbandPhoto = {
          url: BASE_Path + req.files.husbandPhoto[0].filename,
          filename: req.files.husbandPhoto[0].filename
        };
      }

      if (req.files.wifePhoto) {
        fileData.marriageDetails.wifePhoto = {
          url: BASE_Path + req.files.wifePhoto[0].filename,
          filename: req.files.wifePhoto[0].filename
        };
      }

      if (req.files.idCard) {
        fileData.idCard = {
          url: BASE_Path + req.files.idCard[0].filename,
          originalName: req.files.idCard[0].originalname,
          mimeType: req.files.idCard[0].mimetype,
          size: req.files.idCard[0].size
        };
      }

      if (req.files.documents) {
        fileData.documents = req.files.documents.map(file => ({
          url: BASE_Path + file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        }));
      }
    }

    // Get user's location and convert codes to names
    const userLocation = req.user.location;
    // Use location from form if provided (overriding user location for the event location context if allowed)
    // The previous code used userLocation. But the form now sends `location` in body.
    // However, usually event location IS the user's location or the location where event happened?
    // The form allows selecting location so we should prefer that.

    let eventLocation = req.body.location || userLocation;
    // If it came from body as string (should be parsed by normalizeMultipartBody by now), verify

    // Ensure we have Names (logic from previous code assumed converting from User location which might be codes)
    // If it comes from LocationSelector, it usually has names.
    // Let's assume convertLocationCodesToNames handles it safely.
    eventLocation = convertLocationCodesToNames(eventLocation);

    console.log('ðŸ“  Converted location:', {
      original: req.body.location || userLocation,
      converted: eventLocation
    });

    // STRICT HIERARCHY VALIDATION
    if (!validateLocationHierarchy(eventLocation)) {
      console.log('❌ Location hierarchy breach detected during event creation');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid location path. The selected Zone, Woreda, and Kebele must belong to the selected Region.'
      });
    }

    // MARRIAGE-SPECIFIC VALIDATIONS
    if (type === 'marriage') {
      const marriageValidation = await validateMarriageRegistration(details, req.user);

      if (!marriageValidation.isValid) {
        return res.status(marriageValidation.status).json({
          status: 'error',
          message: marriageValidation.message
        });
      }

      console.log('✅ Marriage validation passed:', marriageValidation.logData);
    }

    // BIRTH-SPECIFIC VALIDATIONS & REDUNDANCY CHECK
    if (type === 'birth') {
      const { childName, placeOfBirth } = details;

      // Composite Primary Key logic: Full Name + DOB + Place of Birth
      const existingBirth = await VitalEvent.findOne({
        type: 'birth',
        'birthDetails.childName': { $regex: new RegExp(`^${childName}$`, 'i') },
        eventDate: new Date(eventDate),
        'birthDetails.placeOfBirth': { $regex: new RegExp(`^${placeOfBirth}$`, 'i') }
      });

      if (existingBirth) {
        return res.status(409).json({
          status: 'error',
          message: 'Already Exists: A record with this Full Name, Date of Birth, and Place of Birth already exists. Please use the Update Request path if you need to modify this record.',
          redirectPath: '/update-request'
        });
      }

      // Handle optional child_national_id and is_temporary_id
      if (!details.child_national_id) {
        details.is_temporary_id = true;
      } else {
        details.is_temporary_id = false;
      }
    }

    // Merge details with file data
    // Special handling for birthDetails which is nested
    const finalDetails = { ...details };
    if (type === 'birth') {
      // Merge file data into birthDetails
      finalDetails.childPhoto = fileData.birthDetails.childPhoto;
      finalDetails.parentPhotos = fileData.birthDetails.parentPhotos;
    } else if (type === 'death') {
      finalDetails.deceasedPhoto = fileData.deathDetails.deceasedPhoto;
    } else if (type === 'marriage') {
      finalDetails.husbandPhoto = fileData.marriageDetails.husbandPhoto;
      finalDetails.wifePhoto = fileData.marriageDetails.wifePhoto;
    }

    const vitalEvent = await VitalEvent.create({
      type,
      eventDate,
      citizen: req.user.id,
      location: eventLocation, // Use converted location with names
      [`${type}Details`]: finalDetails,
      idCard: fileData.idCard,
      documents: fileData.documents,
      status: 'pending',
      currentLevel: 'kebele' // Always start at kebele
    });

    console.log('✅ Event created:', {
      eventId: vitalEvent._id,
      location: vitalEvent.location
    });

    // 1. Notify Registrant
    await notify({
      recipient: req.user.id,
      type: 'event_submission',
      category: 'success',
      message: `Your ${type} registration has been sent to the Kebele for review.`,
      data: { eventId: vitalEvent._id, type }
    });

    // 2. Notify Kebele Representatives
    await notifyLocationReps({
      level: 'kebele',
      location: eventLocation,
      type: 'event_submission',
      category: 'action_required',
      message: `New ${type} event submitted from ${req.user.personalInfo.firstName} ${req.user.personalInfo.lastName}.`,
      data: { eventId: vitalEvent._id, citizenId: req.user.id, type }
    });

    res.status(201).json({
      status: 'success',
      data: {
        vitalEvent
      }
    });
  } catch (error) {
    console.error('Create vital event error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Debug endpoint - add this function
exports.debugWoredaEvents = async (req, res) => {
  try {
    const user = req.user;

    console.log('ðŸ” DEBUG: Checking events for woreda:', user.location?.woreda);

    // 1. All events in the database
    const allEvents = await VitalEvent.find({})
      .select('type status currentLevel location')
      .populate('citizen', 'personalInfo location kebeleVerification woredaVerification documents idCard profilePhoto')
      .limit(20);

    // 2. Events in this woreda
    const woredaEvents = await VitalEvent.find({
      'location.woreda': user.location?.woreda
    })
      .select('type status currentLevel location')
      .populate('citizen', 'personalInfo');

    // 3. Events at woreda level
    const woredaLevelEvents = await VitalEvent.find({
      'location.woreda': user.location?.woreda,
      status: 'pending',
      currentLevel: 'woreda'
    })
      .select('type status currentLevel location')
      .populate('citizen', 'personalInfo');

    res.json({
      success: true,
      debug: {
        user: {
          woreda: user.location?.woreda,
          role: user.role
        },
        counts: {
          allEvents: allEvents.length,
          woredaEvents: woredaEvents.length,
          woredaLevelEvents: woredaLevelEvents.length
        },
        allEvents: allEvents.map(e => ({
          id: e._id,
          type: e.type,
          status: e.status,
          currentLevel: e.currentLevel,
          location: e.location,
          citizen: e.citizen?.personalInfo?.firstName + ' ' + e.citizen?.personalInfo?.lastName
        })),
        woredaEvents: woredaEvents.map(e => ({
          id: e._id,
          type: e.type,
          status: e.status,
          currentLevel: e.currentLevel,
          location: e.location,
          citizen: e.citizen?.personalInfo?.firstName + ' ' + e.citizen?.personalInfo?.lastName
        })),
        woredaLevelEvents: woredaLevelEvents.map(e => ({
          id: e._id,
          type: e.type,
          status: e.status,
          currentLevel: e.currentLevel,
          location: e.location,
          citizen: e.citizen?.personalInfo?.firstName + ' ' + e.citizen?.personalInfo?.lastName
        }))
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
// ==================== GET EVENTS FOR REVIEW ====================

exports.getEventsForReview = async (req, res) => {
  try {
    const user = req.user;

    console.log('ðŸ” User requesting events:', {
      role: user.role,
      location: user.location
    });

    // Map user roles to event levels
    const normalizedRole = roleToLevel[user.role] || user.role;

    console.log('🔍 Normalized role:', normalizedRole);

    const userLocNames = convertLocationCodesToNames(user.location) || {};
    const userLocCodes = convertLocationNamesToCodes(user.location) || {};

    // Helper to build a clean $or array without undefined/null/empty values
    const buildCleanOr = (fieldPath, values, includeRegex = true) => {
      const cleanValues = values.filter(v => v !== undefined && v !== null && v !== '');
      if (cleanValues.length === 0) return { [fieldPath]: '__NON_EXISTENT__' }; // Force no match if no values

      const orArray = cleanValues.map(v => ({ [fieldPath]: v }));

      // Also add region/zone name/code specific fields if applicable
      if (fieldPath === 'location.region') {
        cleanValues.forEach(v => orArray.push({ 'location.regionName': v }, { 'location.regionCode': v }));
      } else if (fieldPath === 'location.zone') {
        cleanValues.forEach(v => orArray.push({ 'location.zoneName': v }, { 'location.zoneCode': v }));
      } else if (fieldPath === 'location.woreda') {
        cleanValues.forEach(v => orArray.push({ 'location.woredaName': v }, { 'location.woredaCode': v }));
      } else if (fieldPath === 'location.kebele') {
        cleanValues.forEach(v => orArray.push({ 'location.kebeleName': v }, { 'location.kebeleCode': v }));
      }

      if (includeRegex) {
        cleanValues.forEach(v => {
          const regex = getRegex(v);
          if (regex) orArray.push({ [fieldPath]: regex });
        });
      }
      return { $or: orArray };
    };

    const allEventsQuery = buildJurisdictionQuery(user.location, user.role);

    console.log('ðŸ”  Jurisdiction query:', JSON.stringify(allEventsQuery, null, 2));

    // Get ALL events in this jurisdiction
    const allEvents = await VitalEvent.find(allEventsQuery)
      .populate('citizen', 'personalInfo location kebeleVerification woredaVerification documents idCard profilePhoto')
      .populate('verification.representative', 'personalInfo')
      .sort({ createdAt: -1 }); // Most recent first

    console.log('ðŸ” Found total events:', allEvents.length);

    // Also get the grouped data for stats
    const pendingEvents = allEvents.filter(e =>
      (e.status === 'pending' || e.status === `pending_${normalizedRole}` || e.status.startsWith('pending_')) &&
      e.currentLevel === normalizedRole
    );

    console.log('ðŸ”  Found pending events:', pendingEvents.length);

    // Debug: Show what's in the database
    if (pendingEvents.length === 0) {
      console.log('âš ï¸ No events found. Checking database...');

      // Check ALL events to debug
      const allEvents = await VitalEvent.find({
        'location.woreda': user.location?.woreda
      }).select('type status currentLevel location');

      console.log('ðŸ“Š All events in woreda:', allEvents.map(e => ({
        id: e._id,
        type: e.type,
        status: e.status,
        currentLevel: e.currentLevel,
        woreda: e.location?.woreda,
        kebele: e.location?.kebele
      })));
    }

    const buildSafeQuery = (statusQuery) => {
      // If there's no jurisdiction query (e.g., national), just return the status query
      if (!allEventsQuery || Object.keys(allEventsQuery).length === 0) {
        return statusQuery;
      }
      // Use $and to cleanly combine the jurisdiction query and the status query, avoiding $or conflicts
      return { $and: [allEventsQuery, statusQuery] };
    };

    // Get approved/rejected events for this specific user's jurisdiction
    const [approvedEvents, rejectedEvents] = await Promise.all([
      VitalEvent.find(buildSafeQuery({
        $or: [
          { verification: { $elemMatch: { level: normalizedRole, status: 'approved' } } },
          { status: 'completed' },
          { status: 'approved' }
        ]
      }))
        .populate('citizen', 'personalInfo location kebeleVerification woredaVerification documents idCard profilePhoto')
        .populate('verification.representative', 'personalInfo'),

      VitalEvent.find(buildSafeQuery({
        $or: [
          { verification: { $elemMatch: { level: normalizedRole, status: 'rejected' } } },
          { status: 'rejected' }
        ]
      }))
        .populate('citizen', 'personalInfo location kebeleVerification woredaVerification documents idCard profilePhoto')
        .populate('verification.representative', 'personalInfo')
    ]);

    console.log('ðŸ” Final results:', {
      pending: pendingEvents.length,
      approved: approvedEvents.length,
      rejected: rejectedEvents.length
    });

    // For high levels (Zone, Region, National), treat all hierarchically approved items as 'approved'
    let finalApprovedEvents = approvedEvents;
    let finalPendingEvents = pendingEvents;

    if (['zone', 'region', 'national'].includes(normalizedRole)) {
      // 1. Move all 'pending_zone/region/national' events into approved list for monitoring
      const transitionalEvents = allEvents.filter(e =>
        ['pending_zone', 'pending_region', 'pending_national', 'approved', 'completed'].includes(e.status)
      );

      // Combine with existing approved (avoiding duplicates)
      const approvedIds = new Set(approvedEvents.map(e => e._id.toString()));
      finalApprovedEvents = [...approvedEvents];

      transitionalEvents.forEach(e => {
        if (!approvedIds.has(e._id.toString())) {
          finalApprovedEvents.push(e);
        }
      });

      // 2. Hide pending items as high levels only monitor
      finalPendingEvents = [];
    }

    const events = allEvents;
    const grouped = {
      pending: finalPendingEvents,
      approved: finalApprovedEvents,
      rejected: rejectedEvents
    };

    res.status(200).json({
      status: 'success',
      results: events.length,
      data: {
        events,
        grouped
      }
    });

  } catch (error) {
    console.error('Get events for review error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ==================== REVIEW EVENT ====================

exports.reviewEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status, verificationNotes, comments, officerName } = req.body;
    const effectiveComments = comments || verificationNotes || '';
    const user = req.user;

    console.log('🔍 Reviewing event:', {
      eventId,
      reviewerRole: user.role,
      reviewerLocation: user.location,
      status,
      comments: effectiveComments,
      officerName,
      files: req.files ? Object.keys(req.files) : 'No files'
    });

    const normalizedRole = roleToLevel[user.role] || user.role;

    // Check if representative is active
    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Your account is not active. Please contact your supervisor for activation.'
      });
    }

    const event = await VitalEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    console.log('🔍 Event found:', {
      id: event._id,
      type: event.type,
      currentLevel: event.currentLevel,
      status: event.status,
      location: event.location
    });

    // Check if user has permission to review at this level
    if (event.currentLevel !== normalizedRole) {
      console.log('❌ Level mismatch:', {
        eventLevel: event.currentLevel,
        userLevel: normalizedRole
      });

      return res.status(403).json({
        status: 'error',
        message: `This event is currently at ${event.currentLevel} level, not your level (${normalizedRole})`
      });
    }

    // Add or update verification record for this level (avoid duplicates)
    const existingVerificationIndex = Array.isArray(event.verification)
      ? event.verification.findIndex(v => v && v.level === normalizedRole)
      : -1;

    const verificationRecord = {
      level: normalizedRole,
      representative: user.id,
      status,
      comments: effectiveComments,
      verifiedAt: new Date()
    };

    // Handle Kebele and Woreda approval extras: officerName, seal, signature
    if (['kebele', 'woreda'].includes(normalizedRole) && status === 'approved') {
      if (officerName) {
        verificationRecord.officerName = officerName;
      }
      const BASE_PATH = '/uploads/reviews/';
      if (req.files && req.files.seal) {
        verificationRecord.seal = {
          url: BASE_PATH + req.files.seal[0].filename,
          filename: req.files.seal[0].filename
        };
      }
      if (req.files && req.files.signature) {
        verificationRecord.signature = {
          url: BASE_PATH + req.files.signature[0].filename,
          filename: req.files.signature[0].filename
        };
      }
    }

    if (existingVerificationIndex >= 0) {
      event.verification[existingVerificationIndex] = {
        ...event.verification[existingVerificationIndex].toObject?.(),
        ...verificationRecord
      };
    } else {
      event.verification.push(verificationRecord);
    }

    // Handle status updates - Sequential Forwarding Chain
    if (status === 'approved') {
      console.log('✅ Approving event at level:', normalizedRole);

      if (normalizedRole === 'kebele') {
        event.currentLevel = 'woreda';
        event.status = 'pending_woreda';
        console.log('➡️ Forwarding to Woreda');

        // Notify Citizen
        await notify({
          recipient: event.citizen,
          type: 'event_forwarded',
          category: 'success',
          message: `Approved by Kebele. Your ${event.type} registration has been sent to Woreda.`,
          data: { eventId: event._id, from: 'kebele', to: 'woreda' }
        });

        // Notify Woreda Rep - Search by code or name
        try {
          const woredaRep = await User.findOne({
            role: { $in: ['woreda', 'woreda_representative'] },
            $or: [
              { 'location.woreda': event.location?.woreda },
              { 'location.woredaCode': event.location?.woredaCode }
            ]
          });
          if (woredaRep) {
            await notify({
              recipient: woredaRep._id,
              type: 'event_forwarded',
              category: 'action_required',
              message: `New ${event.type} event from ${event.location?.kebele} pending Woreda review.`,
              data: { eventId: event._id }
            });
          }
        } catch (err) {
          console.error('Notification error:', err);
        }
      } else if (normalizedRole === 'woreda') {
        // WOREDA IS THE FINAL APPROVAL LEVEL
        event.status = 'approved';
        event.currentLevel = 'completed';

        // Code Correction: Ensure location data uses names
        if (event.location) {
          const names = convertLocationCodesToNames(event.location);
          event.location.region = names.region || event.location.region;
          event.location.zone = names.zone || event.location.zone;
          event.location.woreda = names.woreda || event.location.woreda;
          event.location.kebele = names.kebele || event.location.kebele;
        }

        // Generate Certificate Information
        const certNumber = event.certificate?.number || `CERT-${event.type.toUpperCase().substring(0, 1)}${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

        event.certificate = {
          number: certNumber,
          issueDate: new Date(),
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${event._id}`,
          authorizedBy: user.id
        };

        if (event.type === 'birth' && event.birthDetails) {
          event.birthDetails.birthCertificateNumber = certNumber;
        }

        console.log('✅ Event completed at Woreda level. Certificate:', certNumber);

        // CREATE AUTOMATIC ACCOUNT FOR CHILD IF BIRTH EVENT
        if (event.type === 'birth' && event.birthDetails?.childName && !event.registeredUser) {
          await createChildAccountForEvent(event, certNumber);
        }

        // Notify Citizen
        try {
          await notify({
            recipient: event.citizen,
            type: 'event_completed',
            category: 'success',
            message: `Approved by Woreda. Your ${event.type} registration is complete. Certificate Generated: ${certNumber}`,
            data: { eventId: event._id, certNumber }
          });

          const citizenUser = await User.findById(event.citizen);
          if (citizenUser) await sendEventApprovalEmail(citizenUser, event);
        } catch (err) { }
      } else if (normalizedRole === 'zone') {
        event.currentLevel = 'region';
        event.status = 'pending_region';
        console.log('➡️ Forwarding to Region');

        // Notify Citizen
        await notify({
          recipient: event.citizen,
          type: 'event_forwarded',
          category: 'success',
          message: `Approved by Zone. Your ${event.type} registration has been sent to Region.`,
          data: { eventId: event._id, from: 'zone', to: 'region' }
        });

        // Notify Region Rep
        try {
          const regionRep = await User.findOne({
            role: { $in: ['region', 'region_representative'] },
            'location.region': event.location?.region
          });
          if (regionRep) {
            await notify({
              recipient: regionRep._id,
              type: 'event_forwarded',
              category: 'action_required',
              message: `New ${event.type} event from ${event.location?.zone} pending Region review.`,
              data: { eventId: event._id }
            });
          }
        } catch (err) { }
      } else if (normalizedRole === 'region') {
        event.currentLevel = 'national';
        event.status = 'pending_national';
        console.log('➡️ Forwarding to National');

        // Notify Citizen
        await notify({
          recipient: event.citizen,
          type: 'event_forwarded',
          category: 'success',
          message: `Approved by Region. Your ${event.type} registration has been sent to National Authority.`,
          data: { eventId: event._id, from: 'region', to: 'national' }
        });

        // Notify National Rep
        try {
          const nationalRep = await User.findOne({ role: 'national' });
          if (nationalRep) {
            await notify({
              recipient: nationalRep._id,
              type: 'event_forwarded',
              category: 'action_required',
              message: `New ${event.type} event from ${event.location?.region} pending National review.`,
              data: { eventId: event._id }
            });
          }
        } catch (err) { }
      } else if (normalizedRole === 'national') {
        event.status = 'completed';
        event.currentLevel = 'completed';

        // Code Correction: Final Approval at National Level
        const certNumber = event.certificate?.number || `CERT-${event.type.toUpperCase().substring(0, 1)}${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

        event.certificate = {
          number: certNumber,
          issueDate: new Date(),
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${event._id}`,
          authorizedBy: user.id
        };

        if (event.type === 'birth' && event.birthDetails) {
          event.birthDetails.birthCertificateNumber = certNumber;
        }

        // CREATE AUTOMATIC ACCOUNT AT NATIONAL LEVEL IF MISSING
        if (event.type === 'birth' && event.birthDetails?.childName && !event.registeredUser) {
          await createChildAccountForEvent(event, certNumber);
        }

        console.log('✅ Event completed at National level. Certificate:', certNumber);

        // Notify Citizen
        try {
          await notify({
            recipient: event.citizen,
            type: 'event_completed',
            category: 'success',
            message: `Approved by National. Your ${event.type} registration has been finalized. Certificate: ${certNumber}`,
            data: { eventId: event._id, certNumber }
          });

          const citizenUser = await User.findById(event.citizen);
          if (citizenUser) await sendEventApprovalEmail(citizenUser, event);
        } catch (err) { }
      }
    } else if (status === 'rejected') {
      event.status = 'rejected';
      
      // Notify Citizen of Rejection
      await notify({
        recipient: event.citizen,
        type: 'citizen_rejected',
        category: 'action_required',
        message: `Your ${event.type} registration has been rejected by ${normalizedRole}. Reason: ${effectiveComments}`,
        data: { eventId: event._id, level: normalizedRole }
      });
    }

    await event.save();

    console.log('✅ Event saved:', {
      newLevel: event.currentLevel,
      newStatus: event.status,
      verification: event.verification
    });

    res.status(200).json({
      status: 'success',
      data: {
        event
      }
    });
  } catch (error) {
    console.error('Review event error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};


// Add this to vitalEventController.js
exports.testCreateEventForWoreda = async (req, res) => {
  try {
    console.log('ðŸ§ª Creating test event for woreda...');

    // Find a citizen in Woreda 01
    const citizen = await User.findOne({
      role: 'citizen',
      'location.woreda': 'Woreda 01',
      status: 'approved'
    });

    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'No approved citizen found in Woreda 01. Please approve a citizen first.'
      });
    }

    console.log('âœ… Found citizen:', citizen._id);

    // Create a test event already at woreda level
    const testEvent = await VitalEvent.create({
      type: 'marriage',
      eventDate: new Date(),
      citizen: citizen._id,
      location: {
        region: 'Addis Ababa',
        zone: 'Addis Ketema',
        woreda: 'Woreda 01',
        kebele: citizen.location?.kebele
      },
      marriageDetails: {
        husbandName: 'Test Husband',
        wifeName: 'Test Wife',
        marriageType: 'civil',
        witness1: 'Witness One',
        witness2: 'Witness Two'
      },
      status: 'pending',
      currentLevel: 'woreda', // Directly at woreda level
      verification: [
        {
          level: 'kebele',
          representative: citizen._id, // Simulate kebele approval
          status: 'approved',
          comments: 'Test approval from kebele',
          verifiedAt: new Date()
        }
      ]
    });

    console.log('âœ… Test event created at woreda level:', testEvent._id);

    res.json({
      success: true,
      message: 'Test event created at woreda level',
      data: {
        event: {
          id: testEvent._id,
          type: testEvent.type,
          status: testEvent.status,
          currentLevel: testEvent.currentLevel,
          location: testEvent.location
        }
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== OTHER FUNCTIONS ====================

// KEBELE REVIEW CITIZEN REGISTRATION
exports.reviewCitizenRegistration = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { status, comments } = req.body;
    const user = req.user;

    // Only kebele representatives can review citizens initially
    if (!['kebele', 'kebele_representative'].includes(user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only kebele representatives can review citizen registrations'
      });
    }

    const citizen = await User.findById(citizenId);

    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'Citizen not found'
      });
    }

    // Check if citizen is in the same kebele
    const citizenKebele = citizen.location?.kebele || '';
    const userKebele = user.location?.kebele || '';

    if (citizenKebele !== userKebele) {
      return res.status(403).json({
        status: 'error',
        message: 'Citizen is not in your assigned kebele'
      });
    }

    // NEW: When kebele approves, citizen goes to "pending_woreda" status
    // When kebele rejects, citizen stays "rejected" at kebele level

    if (status === 'approved') {
      // Kebele approves â†’ forward to woreda
      citizen.status = 'pending_woreda'; // NEW STATUS
      citizen.verificationLevel = 'kebele_approved'; // NEW
      citizen.approvedByKebele = user._id;
      citizen.kebeleApprovalDate = new Date();
      citizen.kebeleComments = comments;
      citizen.currentApprovalLevel = 'woreda'; // NEW: Track where it needs to go
    } else if (status === 'rejected') {
      // Kebele rejects â†’ citizen rejected
      citizen.status = 'rejected_kebele'; // NEW STATUS
      citizen.verificationLevel = 'rejected';
      citizen.rejectedByKebele = user._id;
      citizen.kebeleRejectionDate = new Date();
      citizen.kebeleRejectionComments = comments;
      citizen.currentApprovalLevel = null; // No further approval needed
    }

    citizen.verifiedBy = user._id;
    citizen.verificationDate = new Date();

    // Add verification record
    citizen.verificationHistory = citizen.verificationHistory || [];
    citizen.verificationHistory.push({
      verifiedBy: user._id,
      level: 'kebele', // Track which level approved
      status,
      comments,
      verifiedAt: new Date()
    });

    await citizen.save();

    // Notify citizen about their status
    await Notification.create({
      type: 'citizen_verification',
      recipient: citizen._id,
      sender: user._id,
      message: status === 'approved'
        ? 'Your citizen registration has been approved by kebele and forwarded to woreda'
        : 'Your citizen registration has been rejected by kebele',
      data: {
        status: citizen.status,
        verifiedBy: user._id,
        verificationDate: new Date(),
        nextLevel: status === 'approved' ? 'woreda' : null
      }
    });

    // NEW: If approved by kebele, notify woreda representative
    if (status === 'approved' && citizen.location) {
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
          sender: user._id,
          message: `New citizen registration forwarded from kebele for woreda review: ${citizen.personalInfo?.firstName} ${citizen.personalInfo?.lastName}`,
          data: {
            citizenId: citizen._id,
            citizenName: `${citizen.personalInfo?.firstName} ${citizen.personalInfo?.lastName}`,
            location: citizen.location?.woreda,
            kebele: citizen.location?.kebele,
            approvedByKebele: user._id,
            approvalDate: new Date()
          },
          read: false
        });

        console.log(`ðŸ“¤ Citizen ${citizen._id} forwarded to woreda representative ${woredaRep._id}`);
      }
    }

    res.status(200).json({
      status: 'success',
      message: status === 'approved'
        ? 'Citizen approved and forwarded to woreda'
        : 'Citizen rejected',
      data: {
        citizen: {
          id: citizen._id,
          name: `${citizen.personalInfo?.firstName} ${citizen.personalInfo?.lastName}`,
          status: citizen.status,
          verificationLevel: citizen.verificationLevel,
          nextLevel: status === 'approved' ? 'woreda' : null
        }
      }
    });
  } catch (error) {
    console.error('Review citizen error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// GET CITIZENS FOR KEBELE REVIEW
exports.getCitizensForReview = async (req, res) => {
  try {
    const user = req.user;

    // Only kebele representatives can see this
    if (user.role !== 'kebele_representative') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Get citizens in this kebele with "pending" status (exclude isChild accounts from vital events)
    const citizens = await User.find({
      role: 'citizen',
      isChild: { $ne: true },  // STRICT ISOLATION: child accounts stay in Vital Events module
      status: 'pending',
      'location.kebele': user.location?.kebele
    }).select('personalInfo location status verificationLevel createdAt');

    res.status(200).json({
      status: 'success',
      results: citizens.length,
      data: {
        citizens
      }
    });
  } catch (error) {
    console.error('Get citizens for review error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get statistics for dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    let stats = {};

    if (user.role === 'citizen') {
      // Citizen stats
      const totalEvents = await VitalEvent.countDocuments({ citizen: user.id });
      const pendingEvents = await VitalEvent.countDocuments({
        citizen: user.id,
        status: 'pending'
      });
      const completedEvents = await VitalEvent.countDocuments({
        citizen: user.id,
        status: 'completed'
      });

      stats = { totalEvents, pendingEvents, completedEvents };
    } else {
      // Representative stats
      let locationQuery = {};

      if (user.role === 'kebele') {
        locationQuery = {
          'location.kebele': user.location?.kebele,
          'location.woreda': user.location?.woreda,
          'location.zone': user.location?.zone,
          'location.region': user.location?.region
        };
      } else if (user.role === 'woreda') {
        locationQuery = {
          'location.woreda': user.location?.woreda,
          'location.zone': user.location?.zone,
          'location.region': user.location?.region
        };
      } else if (user.role === 'zone') {
        locationQuery = {
          'location.zone': user.location?.zone,
          'location.region': user.location?.region
        };
      } else if (user.role === 'region') {
        locationQuery = {
          'location.region': user.location?.region
        };
      }
      // National sees all events

      const totalEvents = await VitalEvent.countDocuments(locationQuery);
      const eventsForReview = await VitalEvent.countDocuments({
        ...locationQuery,
        currentLevel: user.role,
        status: 'pending'
      });
      const completedEvents = await VitalEvent.countDocuments({
        ...locationQuery,
        status: 'completed'
      });

      stats = { totalEvents, eventsForReview, completedEvents };
    }

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};


// Woreda review citizen registration
exports.reviewCitizenWoreda = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { status, comments } = req.body;
    const user = req.user;

    // Only woreda representatives can review at this level
    if (user.role !== 'woreda') {
      return res.status(403).json({
        status: 'error',
        message: 'Only woreda representatives can review citizen registrations at this level'
      });
    }

    const citizen = await User.findById(citizenId);

    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'Citizen not found'
      });
    }

    // Check if citizen is in pending_woreda status and in this woreda
    if (citizen.status !== 'pending_woreda') {
      return res.status(400).json({
        status: 'error',
        message: `Citizen is not pending woreda review. Current status: ${citizen.status}`
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

    // Update citizen status based on woreda decision
    if (status === 'approved') {
      citizen.status = 'approved'; // Final Approval
      citizen.isApproved = true;
      citizen.isActive = true;
      citizen.approvedAt = new Date();
      citizen.verificationLevel = 'woreda_approved';
      citizen.woredaApprovalDate = new Date();
      citizen.woredaComments = comments;

      // Notify Zone Rep
      const zoneRep = await User.findOne({
        role: { $in: ['zone', 'zone_representative'] },
        'location.region': citizen.location.region,
        'location.zone': citizen.location.zone
      });
      if (zoneRep) {
        await Notification.create({
          type: 'citizen_approved',
          recipient: zoneRep._id,
          message: `New citizen registration approved in ${citizen.location.woreda} is now visible for monitoring.`
        });
      }
    } else if (status === 'rejected') {
      citizen.status = 'rejected_woreda'; // Rejected by woreda
      citizen.verificationLevel = 'rejected';
      citizen.rejectedByWoreda = user._id;
      citizen.woredaRejectionDate = new Date();
      citizen.woredaRejectionComments = comments;
      citizen.currentApprovalLevel = null; // No further approval needed
    }

    // Add verification record for woreda level
    citizen.verificationHistory = citizen.verificationHistory || [];
    citizen.verificationHistory.push({
      verifiedBy: user._id,
      level: 'woreda', // Track woreda level approval
      status,
      comments,
      verifiedAt: new Date()
    });

    await citizen.save();

    // Notify citizen about woreda decision
    await Notification.create({
      type: 'citizen_woreda_decision',
      recipient: citizen._id,
      sender: user._id,
      message: status === 'approved'
        ? 'Your citizen registration has been fully approved by woreda'
        : 'Your citizen registration has been rejected by woreda',
      data: {
        status: citizen.status,
        verifiedBy: user._id,
        verificationDate: new Date(),
        isFinal: true
      }
    });

    res.status(200).json({
      status: 'success',
      message: status === 'approved'
        ? 'Citizen fully approved by woreda'
        : 'Citizen rejected by woreda',
      data: {
        citizen: {
          id: citizen._id,
          name: `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}`,
          status: citizen.status,
          verificationLevel: citizen.verificationLevel,
          isActive: status === 'approved' // Can now use the system
        }
      }
    });
  } catch (error) {
    console.error('Woreda review citizen error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Keep other methods but ensure they check citizen approval
exports.getMyEvents = async (req, res) => {
  try {
    // Return events where user is the registrar (citizen) OR the subject (registeredUser for child accounts)
    const events = await VitalEvent.find({ 
      $or: [
        { citizen: req.user.id },
        { registeredUser: req.user.id }
      ]
    })
      .populate('citizen', 'username personalInfo.firstName personalInfo.lastName personalInfo.idNumber location.kebele location.woreda location.region status isChild')
      .populate('registeredUser', 'username personalInfo.firstName personalInfo.lastName personalInfo.idNumber status isActive isChild');
    
    // Sanitize verification records to ensure representative field is never a populated object
    // (prevents React from trying to render an object as child)
    const sanitizedEvents = events.map(event => {
      const obj = event.toObject();
      if (Array.isArray(obj.verification)) {
        obj.verification = obj.verification.map(v => ({
          level: v.level,
          status: v.status,
          comments: v.comments,
          officerName: typeof v.officerName === 'string' ? v.officerName : '',
          seal: v.seal || null,
          signature: v.signature || null,
          verifiedAt: v.verifiedAt
          // representative intentionally omitted to prevent object rendering
        }));
      }
      return obj;
    });

    res.status(200).json({
      status: 'success',
      results: sanitizedEvents.length,
      data: {
        events: sanitizedEvents
      }
    });
  } catch (error) {
    console.error('Get my events error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Helper functions
const hasJurisdiction = (user, event) => {
  if (user.role === 'national') return true;
  if (!user.location || !event.location) return false;

  const uLoc = user.location;
  const eLoc = event.location;

  // Helper to match values regardless of if it's name or code
  const isMatch = (uVal, eVal, eName, eCode) => {
    if (!uVal) return false;
    return eVal === uVal || eName === uVal || eCode === uVal;
  };

  if (user.role.startsWith('region')) {
    return isMatch(uLoc.region, eLoc.region, eLoc.regionName, eLoc.regionCode);
  }

  if (user.role.startsWith('zone')) {
    return isMatch(uLoc.region, eLoc.region, eLoc.regionName, eLoc.regionCode) &&
      isMatch(uLoc.zone, eLoc.zone, eLoc.zoneName, eLoc.zoneCode);
  }

  if (user.role.startsWith('woreda')) {
    return isMatch(uLoc.region, eLoc.region, eLoc.regionName, eLoc.regionCode) &&
      isMatch(uLoc.zone, eLoc.zone, eLoc.zoneName, eLoc.zoneCode) &&
      isMatch(uLoc.woreda, eLoc.woreda, eLoc.woredaName, eLoc.woredaCode);
  }

  if (user.role.startsWith('kebele')) {
    return isMatch(uLoc.region, eLoc.region, eLoc.regionName, eLoc.regionCode) &&
      isMatch(uLoc.zone, eLoc.zone, eLoc.zoneName, eLoc.zoneCode) &&
      isMatch(uLoc.woreda, eLoc.woreda, eLoc.woredaName, eLoc.woredaCode) &&
      isMatch(uLoc.kebele, eLoc.kebele, eLoc.kebeleName, eLoc.kebeleCode);
  }

  return false;
};

const generateCertificateNumber = () => {
  const prefix = 'BIRTH';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

const generateQRCode = (eventId) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${eventId}`;
};

const generateCertificate = (event) => {
  const certificateNumber = `CERT-${event._id.toString().slice(-8).toUpperCase()}`;
  return `/uploads/certificates/${certificateNumber}.pdf`;
};

exports.getJurisdictionStatistics = async (req, res) => {
  try {
    const user = req.user;
    const { timeframe } = req.query;

    if (!user.location && user.role !== 'national') {
      return res.status(400).json({ status: 'error', message: 'User does not have a location assigned' });
    }

    const { convertLocationCodesToNames, convertLocationNamesToCodes, getRegex } = require('../utils/locationHelper');
    const userLocNames = convertLocationCodesToNames(user.location) || {};
    const userLocCodes = convertLocationNamesToCodes(user.location) || {};

    const buildCleanOr = (fieldPath, values) => {
      const cleanValues = values.filter(v => v !== undefined && v !== null && v !== '');
      if (cleanValues.length === 0) return { [fieldPath]: '__NON_EXISTENT__' };

      const orArray = cleanValues.map(v => ({ [fieldPath]: v }));

      const aliases = {
        'location.region': ['location.regionName', 'location.regionCode'],
        'location.zone': ['location.zoneName', 'location.zoneCode'],
        'location.woreda': ['location.woredaName', 'location.woredaCode'],
        'location.kebele': ['location.kebeleName', 'location.kebeleCode']
      };

      if (aliases[fieldPath]) {
        cleanValues.forEach(v => {
          aliases[fieldPath].forEach(alias => orArray.push({ [alias]: v }));
        });
      }

      cleanValues.forEach(v => {
        const regex = getRegex(v);
        if (regex) orArray.push({ [fieldPath]: regex });
      });
      return { $or: orArray };
    };

    const { buildJurisdictionQuery } = require('../utils/locationHelper');
    const jurisdictionQuery = buildJurisdictionQuery(user.location, user.role);

    console.log(`📊 Fetching jurisdiction statistics with query:`, JSON.stringify(jurisdictionQuery));

    const citizenQuery = { role: 'citizen', isChild: { $ne: true }, ...jurisdictionQuery };
    const eventQuery = { ...jurisdictionQuery };

    if (timeframe && timeframe !== 'all') {
      const now = new Date();
      let startDate;
      if (timeframe === 'week') startDate = new Date(now.setDate(now.getDate() - 7));
      else if (timeframe === 'month') startDate = new Date(now.setMonth(now.getMonth() - 1));
      else if (timeframe === 'quarter') startDate = new Date(now.setMonth(now.getMonth() - 3));
      else if (timeframe === 'year') startDate = new Date(now.setFullYear(now.getFullYear() - 1));

      if (startDate) {
        citizenQuery.createdAt = { $gte: startDate };
        eventQuery.createdAt = { $gte: startDate };
      }
    }

    const [citizens, events] = await Promise.all([
      User.find(citizenQuery).select('status createdAt'),
      VitalEvent.find(eventQuery).select('type status createdAt')
    ]);

    const byType = {
      citizen_registration: citizens.length,
      birth: events.filter(e => e.type === 'birth').length,
      death: events.filter(e => e.type === 'death').length,
      marriage: events.filter(e => e.type === 'marriage').length,
      divorce: events.filter(e => e.type === 'divorce').length,
      adoption: events.filter(e => e.type === 'adoption').length
    };

    const byStatus = {
      pending: citizens.filter(c => c.status === 'pending').length + events.filter(e => e.status === 'pending').length,
      approved: citizens.filter(c => c.status === 'approved' || c.status === 'verified').length + events.filter(e => e.status === 'approved' || e.status === 'completed').length,
      rejected: citizens.filter(c => c.status === 'rejected' || c.status === 'rejected_kebele').length + events.filter(e => e.status === 'rejected').length
    };

    const trends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 6; i >= 0; i--) { // Last 7 points for better sparklines
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const mLabel = months[d.getMonth()]; const yr = d.getFullYear(); const m = d.getMonth();
      
      const monCitizens = citizens.filter(c => { const date = new Date(c.createdAt); return date.getMonth() === m && date.getFullYear() === yr; });
      const monEvents = events.filter(e => { const date = new Date(e.createdAt); return date.getMonth() === m && date.getFullYear() === yr; });
      
      const totalCount = monCitizens.length + monEvents.length;
      const pendingCount = monCitizens.filter(c => c.status === 'pending').length + monEvents.filter(e => e.status === 'pending').length;
      const approvedCount = monCitizens.filter(c => c.status === 'approved' || c.status === 'verified').length + monEvents.filter(e => e.status === 'approved' || e.status === 'completed').length;
      
      trends.push({ 
        month: mLabel, 
        events: totalCount,
        pending: pendingCount,
        approved: approvedCount
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        byType, byStatus, trends,
        overallStats: {
          totalEvents: citizens.length + events.length,
          pendingReview: byStatus.pending,
          approvedEvents: byStatus.approved,
          rejectedEvents: byStatus.rejected
        }
      }
    });

  } catch (error) {
    console.error('Jurisdiction statistics error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Unified high-level review for Zone, Region, and National
exports.reviewCitizenHighLevel = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { status, comments } = req.body;
    const user = req.user;

    const normalizedRole = roleToLevel[user.role];
    if (!normalizedRole) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized level review' });
    }

    const citizen = await User.findById(citizenId);
    if (!citizen) return res.status(404).json({ status: 'error', message: 'Citizen not found' });

    // Status transition map
    const transitionMap = {
      zone: { current: 'pending_zone', next: 'pending_region', nextRole: 'region', label: 'Region' },
      region: { current: 'pending_region', next: 'pending_national', nextRole: 'national', label: 'National' },
      national: { current: 'pending_national', next: 'approved', nextRole: null, label: 'Final' }
    };

    const transition = transitionMap[normalizedRole];

    if (citizen.status !== transition.current) {
      return res.status(400).json({ status: 'error', message: `Invalid status for ${normalizedRole} review: ${citizen.status}` });
    }

    if (status === 'approved') {
      citizen.status = transition.next;
      citizen.verificationLevel = `${normalizedRole}_approved`;

      if (normalizedRole === 'national') {
        citizen.isApproved = true;
        citizen.isActive = true;
        citizen.approvedAt = new Date();
      } else {
        // Notify next level
        const nextRepQuery = { role: transition.nextRole };
        if (transition.nextRole !== 'national') {
          nextRepQuery['location.region'] = citizen.location.region;
        }
        const nextRep = await User.findOne(nextRepQuery);
        if (nextRep) {
          await Notification.create({
            type: 'citizen_forwarded',
            recipient: nextRep._id,
            message: `Citizen registration from ${normalizedRole} forwarded to ${transition.label} level.`
          });
        }
      }
    } else {
      citizen.status = `rejected_${normalizedRole}`;
      citizen.verificationLevel = 'rejected';
    }

    citizen.verificationHistory.push({
      verifiedBy: user._id,
      level: normalizedRole,
      status,
      comments,
      verifiedAt: new Date()
    });

    await citizen.save();

    res.status(200).json({ status: 'success', message: `${normalizedRole} review completed`, data: { citizen } });
  } catch (error) {
    console.error('High-level review error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
// Verify if a National ID exists (matches birth/citizen registration)
exports.verifyNationalId = async (req, res) => {
  try {
    const { idNumber } = req.params;

    if (!idNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'National ID is required'
      });
    }

    // Find citizen with this ID number (16 digits)
    const citizen = await User.findOne({
      role: 'citizen',
      $or: [
        { 'personalInfo.idNumber': idNumber },
        { 'idNumber': idNumber } // Check both locations just in case
      ]
    }).select('personalInfo.firstName personalInfo.lastName');

    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'your national id not match from birth registration'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        name: `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}`
      }
    });
  } catch (error) {
    console.error('Verify National ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error during ID verification'
    });
  }
};

// ==================== MARRIAGE VALIDATION HELPER ====================

/**
 * Validates marriage registration requirements
 * @param {Object} marriageDetails - Marriage registration details
 * @param {Object} registrar - User registering the marriage
 * @returns {Object} Validation result with isValid, status, message, and logData
 */
const validateMarriageRegistration = async (marriageDetails, registrar) => {
  const { husbandNationalId, wifeNationalId } = marriageDetails;

  try {
    // Validate National ID format (exactly 16 digits)
    const idValidationRegex = /^\d{16}$/;

    if (!husbandNationalId || !idValidationRegex.test(husbandNationalId)) {
      return {
        isValid: false,
        status: 400,
        message: 'Husband\'s National ID must be exactly 16 digits'
      };
    }

    if (!wifeNationalId || !idValidationRegex.test(wifeNationalId)) {
      return {
        isValid: false,
        status: 400,
        message: 'Wife\'s National ID must be exactly 16 digits'
      };
    }

    // STRICT VALIDATION: Verify both National IDs exactly match birth registration records
    const [husbandBirthMatch, wifeBirthMatch] = await Promise.all([
      // Check husband's National ID against birth registration
      User.findOne({
        role: 'citizen',
        $or: [
          { 'personalInfo.idNumber': husbandNationalId },
          { 'idNumber': husbandNationalId }
        ]
      }).select('personalInfo.firstName personalInfo.lastName personalInfo.idNumber personalInfo.dateOfBirth'),

      // Check wife's National ID against birth registration
      User.findOne({
        role: 'citizen',
        $or: [
          { 'personalInfo.idNumber': wifeNationalId },
          { 'idNumber': wifeNationalId }
        ]
      }).select('personalInfo.firstName personalInfo.lastName personalInfo.idNumber personalInfo.dateOfBirth')
    ]);

    // STRICT VALIDATION: Block registration if IDs don't match birth registration exactly
    if (!husbandBirthMatch) {
      return {
        isValid: false,
        status: 404,
        message: `Husband's National ID ${husbandNationalId} does not match any birth registration record. Marriage registration blocked.`
      };
    }

    if (!wifeBirthMatch) {
      return {
        isValid: false,
        status: 404,
        message: `Wife's National ID ${wifeNationalId} does not match any birth registration record. Marriage registration blocked.`
      };
    }

    // LOGIC CORRECTION: If IDs match birth registration, citizens are inherently valid
    // No need for additional isActive check since birth registration confirms existence

    // Ensure registrar is one of the spouses (strict validation)
    const registrarIdNumber = registrar.personalInfo?.idNumber || registrar.idNumber;
    if (registrarIdNumber !== husbandNationalId && registrarIdNumber !== wifeNationalId) {
      return {
        isValid: false,
        status: 403,
        message: 'Only the husband or wife can register their marriage. Your National ID does not match either spouse\'s birth registration record.'
      };
    }

    // Return success with detailed logging data
    return {
      isValid: true,
      status: 200,
      message: 'Marriage registration validation successful - National IDs verified against birth registration',
      logData: {
        husband: {
          name: `${husbandBirthMatch.personalInfo.firstName} ${husbandBirthMatch.personalInfo.lastName}`,
          nationalId: husbandNationalId,
          birthVerified: true
        },
        wife: {
          name: `${wifeBirthMatch.personalInfo.firstName} ${wifeBirthMatch.personalInfo.lastName}`,
          nationalId: wifeNationalId,
          birthVerified: true
        },
        registrar: registrar.personalInfo?.firstName || registrar.name,
        validationType: 'STRICT_BIRTH_REGISTRATION_MATCH'
      }
    };

  } catch (validationError) {
    console.error('❌ Strict Marriage ID validation error:', validationError);
    return {
      isValid: false,
      status: 500,
      message: 'Error validating National IDs against birth registration records'
    };
  }
};

// Helper to create child account and populate event info
const createChildAccountForEvent = async (event, certNumber) => {
  try {
    const birthDetails = event.birthDetails;
    if (!birthDetails?.childName) return;

    // Generate username
    let baseUsername = birthDetails.childName.toLowerCase().replace(/\s+/g, '');
    let username = baseUsername;
    let counter = 1;
    while (await User.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Name parsing
    const nameParts = birthDetails.childName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1
      ? nameParts.slice(1).join(' ')
      : (birthDetails.fatherName ? birthDetails.fatherName.split(' ')[0] : 'Citizen');

    // Linkage
    const parentUser = await User.findById(event.citizen);
    const parentNationalId = parentUser?.personalInfo?.idNumber || '';

    const isTemporary = birthDetails.is_temporary_id === 'true' || birthDetails.is_temporary_id === true;

    const childAccount = await User.create({
      username,
      password: certNumber,
      role: 'citizen',
      personalInfo: {
        firstName,
        lastName,
        dateOfBirth: event.eventDate,
        gender: birthDetails.gender,
        idNumber: isTemporary ? certNumber : (birthDetails.child_national_id || certNumber)
      },
      location: event.location,
      isActive: true,
      isApproved: true,
      status: 'approved',
      profilePhoto: birthDetails.childPhoto ? {
        url: birthDetails.childPhoto.url,
        filename: birthDetails.childPhoto.filename
      } : undefined,
      isChild: true,
      createdBy: event.citizen,
      identityLinkage: {
        is_temporary_id: isTemporary,
        id_type: isTemporary ? "Parental Reference" : "National ID",
        reference_id: isTemporary ? parentNationalId : undefined
      }
    });

    event.registeredUser = childAccount._id;
    event.childAccountInfo = { username, initialPassword: certNumber };
    
    // Notify parent
    await Notification.create({
      type: 'system',
      recipient: event.citizen,
      message: `An account has been created for your child (${birthDetails.childName}). Username: ${username}, Password: ${certNumber}.`,
      data: { childUsername: username, childPassword: certNumber }
    });

    console.log(`✅ Automatic account created for child: ${username}`);
  } catch (err) {
    console.error('❌ Failed to create child account:', err);
  }
};

exports.checkMarriageStatus = async (req, res) => {
  try {
    const user = req.user;
    const userId = user._id;
    const nationalId = user.personalInfo?.idNumber;
    
    // Find an approved or completed marriage event where user is involved
    const query = {
      type: 'marriage',
      status: { $in: ['approved', 'completed'] },
      $or: [
        { citizen: userId }
      ]
    };
    
    if (nationalId) {
      query.$or.push({ 'marriageDetails.husbandNationalId': nationalId });
      query.$or.push({ 'marriageDetails.wifeNationalId': nationalId });
    }

    const marriage = await VitalEvent.findOne(query).sort({ createdAt: -1 });

    if (!marriage) {
      return res.json({
        status: 'success',
        data: {
          isMarried: false
        }
      });
    }

    res.json({
      status: 'success',
      data: {
        isMarried: true,
        marriageDetails: marriage.marriageDetails
      }
    });

  } catch (error) {
    console.error('Check marriage status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify marriage status'
    });
  }
};

