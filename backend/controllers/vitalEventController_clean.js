const VitalEvent = require('../models/VitalEvent');
const User = require('../models/User');
const Notification = require('../models/Notification');
const path = require('path');
const fs = require('fs');
const vitalEventController = require('../controllers/vitalEventController');
// ==================== LOCATION HELPER FUNCTIONS ====================

// Location mapping - codes to names
const locationMapping = {
  regions: {
    '1': 'Addis Ababa',
    '2': 'Afar',
    '3': 'Amhara',
    '4': 'Benishangul-Gumuz',
    '5': 'Dire Dawa',
    '6': 'Gambela',
    '7': 'Harari',
    '8': 'Oromia',
    '9': 'Sidama',
    '10': 'Somali',
    '11': 'South West Ethiopia Peoples',
    '12': 'Southern Nations, Nationalities, and Peoples',
    '13': 'Tigray'
  },
  zones: {
    '1_1': 'Addis Ketema',
    '1_2': 'Akaki Kaliti',
    '1_3': 'Arada',
    '1_4': 'Bole',
    '1_5': 'Gulele',
    '1_6': 'Kirkos',
    '1_7': 'Kolfe Keranio',
    '1_8': 'Lideta',
    '1_9': 'Nifas Silk-Lafto',
    '1_10': 'Yeka',
    '2_1': 'North afar',
    '2_2': 'South afar',
    '2_3': 'afar1',
    '2_4': 'afar2',
    '2_5': 'afar3',
    '2_6': 'afar4',
    '3_1': 'North Gondar',
    '3_2': 'South Gondar',
    '3_3': 'North Wollo',
    '3_4': 'South Wollo',
    '3_5': 'Oromia Special Zone',
    '3_6': 'Bahir Dar Special Zone',
    '3_7': 'Awi Zone',
    '3_8': 'East Gojjam',
    '3_9': 'West Gojjam',
    '3_10': 'Wag Hemra Zone',
    '8_1': 'East Shewa',
    '8_2': 'West Shewa',
    '8_3': 'North Shewa',
    '8_4': 'Arsi',
    '8_5': 'Bale',
    '8_6': 'Borana',
    '8_7': 'East Hararghe',
    '8_8': 'West Hararghe',
    '8_9': 'Illubabor',
    '8_10': 'Jimma'
  },
  woredas: {
    '1_1_1': 'Woreda01',
    '1_1_2': 'Woreda02',
    '1_1_3': 'Woreda03',
    '1_1_4': 'Woreda04',
    '1_1_5': 'Woreda05',
    '1_4_1': 'Bole Woreda 01',
    '1_4_2': 'Bole Woreda 02',
    '1_4_3': 'Bole Woreda 03',
    '1_4_4': 'Bole Woreda 04',
    '1_4_5': 'Bole Woreda 05',
    '2_1_1': 'NF Woreda 01',
    '2_1_2': 'NF Woreda 02',
    '2_1_3': 'NF Woreda 03',
    '2_1_4': 'NF Woreda 04',
    '2_1_5': 'NF Woreda 05',
    '2_2_1': 'SF Woreda 01',
    '2_2_2': 'SF Woreda 02',
    '2_2_3': 'SF Woreda 03',
    '2_2_4': 'SF Woreda 04',
    '2_2_5': 'SF Woreda 05',
    '2_3_1': 'afar1 Woreda 01',
    '2_3_2': 'afar1 Woreda 02',
    '2_3_3': 'afar1 Woreda 03',
    '2_3_4': 'afar1 Woreda 04',
    '2_3_5': 'afar1 Woreda 05',
    '3_1_1': 'Gondar Zuria',
    '3_1_2': 'Dabat',
    '3_1_3': 'Debark',
    '3_1_4': 'Metema',
    '3_1_5': 'Quara',
    '3_2_1': 'SG woreda01',
    '3_2_2': 'SG woreda02',
    '3_2_3': 'SG woreda03',
    '3_2_4': 'SG woreda04',
    '3_2_5': 'SG woreda05',
    '3_3_1': 'NW woreda01',
    '3_3_2': 'NW woreda02',
    '3_3_3': 'NW woreda03',
    '3_3_4': 'NW woreda04',
    '3_3_5': 'NW woreda05',
    '8_1_1': "Ada'a",
    '8_1_2': 'Liben',
    '8_1_3': 'Boset',
    '8_1_4': 'Gimbichu',
    '8_1_5': 'Lome',
    '8_4_1': 'Arsi1',
    '8_4_2': 'Arsi2',
    '8_4_3': 'Arsi3',
    '8_4_4': 'Arsi4',
    '8_4_5': 'Arsi5',
    '8_10_1': 'Jimma Town',
    '8_10_2': 'Agaro',
    '8_10_3': 'Seka Chekorsa',
    '8_10_4': 'Manna',
    '8_10_5': 'Gomma'
  }
};

// Function to convert location codes to names
const convertLocationCodesToNames = (location) => {
  if (!location) return location;

  const converted = { ...location };

  // Convert region code to name
  if (converted.region && locationMapping.regions[converted.region]) {
    converted.region = locationMapping.regions[converted.region];
    converted.regionCode = location.region; // Keep original code for reference
  }

  // Convert zone code to name
  if (converted.zone && locationMapping.zones[converted.zone]) {
    converted.zone = locationMapping.zones[converted.zone];
    converted.zoneCode = location.zone; // Keep original code for reference
  }

  // Convert woreda code to name if needed
  if (converted.woreda && locationMapping.woredas[converted.woreda]) {
    converted.woreda = locationMapping.woredas[converted.woreda];
    converted.woredaCode = location.woreda;
  }

  return converted;
};

// Function to convert location names to codes (for queries)
const convertLocationNamesToCodes = (location) => {
  if (!location) return location;

  const converted = { ...location };

  // Find region code for name
  if (converted.region) {
    const regionEntry = Object.entries(locationMapping.regions).find(
      ([code, name]) => name === converted.region
    );
    if (regionEntry) {
      converted.region = regionEntry[0]; // Use code
      converted.regionName = regionEntry[1]; // Keep name
    }
  }

  // Find zone code for name
  if (converted.zone) {
    const zoneEntry = Object.entries(locationMapping.zones).find(
      ([code, name]) => name === converted.zone
    );
    if (zoneEntry) {
      converted.zone = zoneEntry[0]; // Use code
      converted.zoneName = zoneEntry[1]; // Keep name
    }
  }

  return converted;
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

    console.log('ðŸ“ Creating vital event for user:', {
      userId: req.user.id,
      userLocation: req.user.location,
      files: req.files ? Object.keys(req.files) : 'No files'
    });

    // Handle files
    let fileData = {
      birthDetails: {}
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
        if (!fileData.birthDetails.parentPhotos) fileData.birthDetails.parentPhotos = {}; // Redundant check safely
        if (fileData.birthDetails.parentPhotos) { // Ensure object exists
          fileData.birthDetails.parentPhotos.mother = {
            url: BASE_Path + req.files.motherPhoto[0].filename,
            filename: req.files.motherPhoto[0].filename
          };
        }
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

    console.log('ðŸ“ Converted location:', {
      original: req.body.location || userLocation,
      converted: eventLocation
    });

    // Merge details with file data
    // Special handling for birthDetails which is nested
    const finalDetails = { ...details };
    if (type === 'birth') {
      // Merge file data into birthDetails
      finalDetails.childPhoto = fileData.birthDetails.childPhoto;
      finalDetails.parentPhotos = fileData.birthDetails.parentPhotos;
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

    console.log('âœ… Event created:', {
      eventId: vitalEvent._id,
      location: vitalEvent.location
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
      .populate('citizen', 'personalInfo')
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

    const normalizedRole = roleToLevel[user.role] || user.role;

    console.log('ðŸ” Normalized role:', normalizedRole);

    // SIMPLE QUERY - Get ALL events in this jurisdiction (pending, approved, rejected, completed)
    let allEventsQuery = {};

    // Add location filter
    if (normalizedRole === 'woreda') {
      if (user.location?.woreda) {
        allEventsQuery['location.woreda'] = user.location.woreda;
      }
    } else if (normalizedRole === 'kebele') {
      if (user.location?.kebele) {
        allEventsQuery['location.kebele'] = user.location.kebele;
      }
    }

    console.log('ðŸ” All events query:', JSON.stringify(allEventsQuery, null, 2));

    // Get ALL events in this jurisdiction
    const allEvents = await VitalEvent.find(allEventsQuery)
      .populate('citizen', 'personalInfo')
      .populate('verification.representative', 'personalInfo')
      .sort({ createdAt: -1 }); // Most recent first

    console.log('ðŸ” Found total events:', allEvents.length);

    // Also get the grouped data for stats
    const pendingQuery = { ...allEventsQuery, status: 'pending', currentLevel: normalizedRole };
    const pendingEvents = allEvents.filter(e => e.status === 'pending' && e.currentLevel === normalizedRole);

    console.log('ðŸ” Found pending events:', pendingEvents.length);

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

    // Get approved/rejected events
    let jurisdictionQuery = {};
    if (user.location?.woreda) {
      jurisdictionQuery['location.woreda'] = user.location.woreda;
    }

    const [approvedEvents, rejectedEvents] = await Promise.all([
      VitalEvent.find({
        ...jurisdictionQuery,
        $or: [
          { verification: { $elemMatch: { level: normalizedRole, status: 'approved' } } },
          { status: 'completed' }
        ]
      })
        .populate('citizen', 'personalInfo')
        .populate('verification.representative', 'personalInfo'),

      VitalEvent.find({
        ...jurisdictionQuery,
        $or: [
          { verification: { $elemMatch: { level: normalizedRole, status: 'rejected' } } },
          { status: 'rejected' }
        ]
      })
        .populate('citizen', 'personalInfo')
        .populate('verification.representative', 'personalInfo')
    ]);

    console.log('ðŸ” Final results:', {
      pending: pendingEvents.length,
      approved: approvedEvents.length,
      rejected: rejectedEvents.length
    });

    const events = allEvents; // Return ALL events, not just pending
    const grouped = {
      pending: pendingEvents,
      approved: approvedEvents,
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
    const { status, comments } = req.body;
    const user = req.user;

    console.log('ðŸ” Reviewing event:', {
      eventId,
      reviewerRole: user.role,
      reviewerLocation: user.location,
      status,
      comments
    });

    const roleToLevel = {
      kebele_representative: 'kebele',
      woreda_representative: 'woreda',
      zone_representative: 'zone',
      region_representative: 'region',
      kebele: 'kebele',
      woreda: 'woreda',
      zone: 'zone',
      region: 'region',
      national: 'national'
    };

    const normalizedRole = roleToLevel[user.role] || user.role;

    const event = await VitalEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    console.log('ðŸ” Event found:', {
      id: event._id,
      type: event.type,
      currentLevel: event.currentLevel,
      status: event.status,
      location: event.location
    });

    // Check if user has permission to review at this level
    if (event.currentLevel !== normalizedRole) {
      console.log('âŒ Level mismatch:', {
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
      comments,
      reviewedAt: new Date()
    };

    if (existingVerificationIndex >= 0) {
      event.verification[existingVerificationIndex] = {
        ...event.verification[existingVerificationIndex].toObject?.(),
        ...verificationRecord
      };
    } else {
      event.verification.push(verificationRecord);
    }

    // Handle status updates - FIX THIS PART!
    if (status === 'approved') {
      console.log('âœ… Approving event at level:', normalizedRole);

      if (normalizedRole === 'kebele') {
        // Kebele approves â†’ move to woreda
        event.currentLevel = 'woreda';
        event.status = 'pending';
        console.log('âž¡ï¸ Forwarding event from kebele to woreda');

        // Notify woreda representative
        const woredaRep = await User.findOne({
          $or: [
            { role: 'woreda_representative' },
            { role: 'woreda' }
          ],
          $or: [
            { 'location.woreda': event.location.woreda },
            { 'location.woredaName': event.location.woreda }
          ]
        });

        if (woredaRep) {
          await Notification.create({
            type: 'event_forwarded_to_woreda',
            recipient: woredaRep._id,
            sender: user._id,
            message: `New ${event.type} event forwarded to woreda for review`,
            data: {
              eventId: event._id,
              eventType: event.type,
              citizenId: event.citizen,
              location: event.location.woreda,
              forwardedBy: user._id
            }
          });
          console.log('ðŸ”” Notification sent to woreda representative');
        }
      } else if (normalizedRole === 'woreda') {
        // Woreda approves â†’ event is completed
        event.status = 'completed';
        // Keep currentLevel as 'woreda' since that's the last level that approved it
        console.log('âœ… Event completed at woreda level');

        // Generate certificate (you'll implement this)
        // event.certificateNumber = generateCertificateNumber();
      } else {
        console.log('âš ï¸ Other level approval - no forwarding needed');
        event.status = 'completed';
      }
    } else if (status === 'rejected') {
      event.status = 'rejected';
      console.log('âŒ Event rejected at level:', normalizedRole);

      // If rejected at woreda, send back to citizen
      if (normalizedRole === 'woreda') {
        event.currentLevel = 'kebele'; // Or 'citizen' depending on your workflow
      }
    }

    await event.save();

    console.log('âœ… Event saved:', {
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
        kebele: citizen.location.kebele
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
          reviewedAt: new Date()
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
    if (user.role !== 'kebele_representative') {
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
    if (citizen.location.kebele !== user.location.kebele) {
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
    if (status === 'approved') {
      const woredaRep = await User.findOne({
        role: 'woreda',
        'location.woreda': citizen.location.woreda,
        'location.zone': citizen.location.zone,
        'location.region': citizen.location.region
      });

      if (woredaRep) {
        await Notification.create({
          type: 'citizen_woreda_review',
          recipient: woredaRep._id,
          sender: user._id,
          message: `New citizen registration forwarded from kebele for woreda review: ${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}`,
          data: {
            citizenId: citizen._id,
            citizenName: `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}`,
            location: citizen.location.woreda,
            kebele: citizen.location.kebele,
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
          name: `${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}`,
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

    // Get citizens in this kebele with "pending" status
    const citizens = await User.find({
      role: 'citizen',
      status: 'pending',
      'location.kebele': user.location.kebele
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
          'location.kebele': user.location.kebele,
          'location.woreda': user.location.woreda,
          'location.zone': user.location.zone,
          'location.region': user.location.region
        };
      } else if (user.role === 'woreda') {
        locationQuery = {
          'location.woreda': user.location.woreda,
          'location.zone': user.location.zone,
          'location.region': user.location.region
        };
      } else if (user.role === 'zone') {
        locationQuery = {
          'location.zone': user.location.zone,
          'location.region': user.location.region
        };
      } else if (user.role === 'region') {
        locationQuery = {
          'location.region': user.location.region
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

    if (citizen.location.woreda !== user.location.woreda) {
      return res.status(403).json({
        status: 'error',
        message: 'Citizen is not in your assigned woreda'
      });
    }

    // Update citizen status based on woreda decision
    if (status === 'approved') {
      citizen.status = 'approved'; // Final approval
      citizen.verificationLevel = 'verified';
      citizen.approvedByWoreda = user._id;
      citizen.woredaApprovalDate = new Date();
      citizen.woredaComments = comments;
      citizen.currentApprovalLevel = null; // Completed
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
    const events = await VitalEvent.find({ citizen: req.user.id });

    res.status(200).json({
      status: 'success',
      results: events.length,
      data: {
        events
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

  if (user.role === 'region') {
    return event.location.region === user.location.region;
  }

  if (user.role === 'zone') {
    return event.location.region === user.location.region &&
      event.location.zone === user.location.zone;
  }

  if (user.role === 'woreda') {
    return event.location.region === user.location.region &&
      event.location.zone === user.location.zone &&
      event.location.woreda === user.location.woreda;
  }

  if (user.role === 'kebele') {
    return event.location.region === user.location.region &&
      event.location.zone === user.location.zone &&
      event.location.woreda === user.location.woreda &&
      event.location.kebele === user.location.kebele;
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
