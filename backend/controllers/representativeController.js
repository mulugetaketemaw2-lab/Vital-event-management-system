const User = require('../models/User');
const VitalEvent = require('../models/VitalEvent');
const { buildJurisdictionQuery, isLocationMatch } = require('../utils/locationHelper');

// Get dashboard statistics for representatives
exports.getRepresentativeStats = async (req, res) => {
  try {
    const user = req.user;
    let stats = {};

    // Get representatives under this user's jurisdiction
    const approvableRoles = getApprovableRoles(user.role);
    
    const jurisdictionQuery = buildJurisdictionQuery(user.location, user.role);
    const repQuery = { 
        ...jurisdictionQuery,
        role: { $in: approvableRoles } 
    };

    const totalRepresentatives = await User.countDocuments(repQuery);

    const pendingActivations = await User.countDocuments({
      ...repQuery,
      isActive: false
    });

    // Get event statistics based on role
    // Re-use jurisdictionQuery from above for vital events
    const locationQuery = jurisdictionQuery;

    const totalEvents = await VitalEvent.countDocuments(locationQuery);
    const eventsForReview = await VitalEvent.countDocuments({
      ...locationQuery,
      currentLevel: user.role,
      status: 'pending'
    });

    stats = {
      totalRepresentatives,
      pendingActivations,
      totalEvents,
      eventsForReview
    };

    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('Get representative stats error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Search citizens based on role and jurisdiction
exports.searchCitizens = async (req, res) => {
  try {
    const user = req.user;
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.status(200).json({
        status: 'success',
        results: 0,
        data: { citizens: [] }
      });
    }

    // Role-based search scope
    const jurisdictionQuery = buildJurisdictionQuery(user.location, user.role);
    const filter = { 
        ...jurisdictionQuery,
        role: 'citizen' 
    };

    // Search by ID (exact match preference) or Full Name
    const searchQuery = {
      $or: [
        { 'personalInfo.idNumber': { $regex: query, $options: 'i' } },
        { 'personalInfo.firstName': { $regex: query, $options: 'i' } },
        { 'personalInfo.lastName': { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } }
      ]
    };

    const finalQuery = { ...filter, ...searchQuery };

    const citizens = await User.find(finalQuery)
      .limit(50) // High speed limitation for million records
      .select('-password -activationToken')
      .sort({ 'personalInfo.firstName': 1 }); // Alpha sort for predictability

    res.status(200).json({
      status: 'success',
      results: citizens.length,
      data: {
        citizens
      }
    });
  } catch (error) {
    console.error('Search citizens error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get details of a specific citizen with jurisdiction check
exports.getCitizenDetails = async (req, res) => {
  try {
    const { citizenId } = req.params;
    const user = req.user;

    const citizen = await User.findById(citizenId).select('-password -activationToken');

    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'Citizen not found'
      });
    }

    // Role-based jurisdiction check
    let isAuthorized = false;
    const { role, location } = user;

    if (role === 'national') {
      isAuthorized = true;
    } else if (role === 'region') {
      isAuthorized = citizen.location.region === location.region;
    } else if (role === 'zone') {
      isAuthorized = citizen.location.region === location.region &&
        citizen.location.zone === location.zone;
    } else if (role === 'woreda') {
      isAuthorized = citizen.location.region === location.region &&
        citizen.location.zone === location.zone &&
        citizen.location.woreda === location.woreda;
    } else if (role === 'kebele') {
      isAuthorized = citizen.location.region === location.region &&
        citizen.location.zone === location.zone &&
        citizen.location.woreda === location.woreda &&
        citizen.location.kebele === location.kebele;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to view citizens outside your jurisdiction'
      });
    }

    // Fetch vital events for this citizen too
    const events = await VitalEvent.find({ citizen: citizenId }).sort({ eventDate: -1 });

    res.status(200).json({
      status: 'success',
      data: {
        citizen,
        events
      }
    });
  } catch (error) {
    console.error('Get citizen details error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get users that need approval (for the current user's level)
exports.getPendingApprovals = async (req, res) => {
  try {
    const user = req.user;

    // Determine which roles the current user can approve
    const approvableRoles = getApprovableRoles(user.role);

    // Only show pending users created by this representative
    // OR show all if it's national level (though national usually only sees regional)
    const query = {
      role: { $in: approvableRoles },
      isActive: false
    };

    // Apply strict jurisdiction filtering for non-national representatives
    if (user.role !== 'national') {
      const jurisdictionQuery = buildJurisdictionQuery(user.location, user.role);
      Object.assign(query, jurisdictionQuery);
    }

    const users = await User.find(query)
      .select('-password -activationToken')
      .populate({
        path: 'createdBy',
        select: 'username personalInfo',
        strictPopulate: false
      });

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Activate user account (approve by higher level)
exports.activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Check if current user can activate this role
    if (!canActivateRole(req.user.role, user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `You don't have permission to activate ${user.role} accounts`
      });
    }

    // Check location hierarchy for activation
    if (!validateActivationHierarchy(req.user, user)) {
      return res.status(403).json({
        status: 'error',
        message: 'You can only activate representatives in your jurisdiction'
      });
    }

    user.isActive = true;
    user.isApproved = true;
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    await user.save();

    res.status(200).json({
      status: 'success',
      message: `${user.role} representative activated successfully`,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create representative account (by higher-level user)
exports.createRepresentative = async (req, res) => {
  try {
    let { username, password, role, personalInfo, location, officeInfo } = req.body;

    // Parse stringified JSON from FormData if necessary
    try {
      if (typeof personalInfo === 'string') personalInfo = JSON.parse(personalInfo);
    } catch(e) { personalInfo = {}; }
    
    try {
      if (typeof location === 'string') location = JSON.parse(location);
    } catch(e) { location = {}; }
    
    try {
      if (typeof officeInfo === 'string') officeInfo = JSON.parse(officeInfo);
    } catch(e) { officeInfo = {}; }
    // Validate role creation permission
    if (!canCreateRole(req.user.role, role)) {
      return res.status(403).json({
        status: 'error',
        message: `You don't have permission to create ${role} accounts`
      });
    }

    // Validate location hierarchy
    if (!validateLocationHierarchy(req.user, role, location)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid location assignment for this role'
      });
    }

    // CHECK FOR REDUNDANCY: Ensure this office doesn't already have an active/pending representative
    // This enforces the "One Office, One Truth" rule for synchronization.
    // Multiple representatives for the same jurisdiction are allowed.
    // They will automatically see the same synchronized data based on location.

    // Create proper location object based on role
    const locationData = {
      region: location.region || '',
      zone: role === 'zone' || role === 'woreda' || role === 'kebele' ? location.zone || '' : '',
      woreda: role === 'woreda' || role === 'kebele' ? location.woreda || '' : '',
      kebele: role === 'kebele' ? location.kebele || '' : ''
    };

    const roleLabel = (role || 'representative').toString().toUpperCase();

    const safePersonalInfo = {
      firstName: personalInfo?.firstName || roleLabel,
      lastName: personalInfo?.lastName || 'OFFICE',
      email: personalInfo?.email || '',
      phone: personalInfo?.phone || '',
      specialInformation: personalInfo?.specialInformation || ''
    };

    if (req.file) {
      safePersonalInfo.photo = {
        url: `/uploads/representatives/${req.file.filename}`,
        filename: req.file.filename,
        uploadedAt: new Date()
      };
    }

    const idNumber = typeof personalInfo?.idNumber === 'string' ? personalInfo.idNumber.trim() : '';
    if (idNumber) {
      safePersonalInfo.idNumber = idNumber;
    }

    const userData = {
      username,
      password,
      role,
      personalInfo: safePersonalInfo,
      location: locationData,
      officeInfo,
      createdBy: req.user._id,
      isActive: false,
      isApproved: false
    };

    console.log('Creating user with data:', userData); // Debug log

    const newUser = await User.create(userData);

    res.status(201).json({
      status: 'success',
      message: `${role} representative account created successfully. They can login after activation.`,
      data: {
        user: newUser
      }
    });
  } catch (error) {
    console.error('Create representative error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get all representatives under current user's jurisdiction
exports.getMyRepresentatives = async (req, res) => {
  try {
    const user = req.user;
    const approvableRoles = getApprovableRoles(user.role);

    const jurisdictionQuery = buildJurisdictionQuery(user.location, user.role);
    const query = {
      ...jurisdictionQuery,
      role: { $in: approvableRoles }
    };

    const representatives = await User.find(query).select('-password');

    res.status(200).json({
      status: 'success',
      results: representatives.length,
      data: {
        representatives
      }
    });
  } catch (error) {
    console.error('Get my representatives error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update representative
exports.updateRepresentative = async (req, res) => {
  try {
    const { userId } = req.params;
    const { personalInfo, officeInfo, location, username, password } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    if (!isAuthorizedToManage(req.user, user)) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to manage this account under your jurisdiction' });
    }

    if (personalInfo) {
      user.personalInfo = { ...user.personalInfo, ...personalInfo };
    }
    if (officeInfo) {
      user.officeInfo = { ...user.officeInfo, ...officeInfo };
    }
    if (location) {
      user.location = { ...user.location, ...location };
    }
    if (username) {
      user.username = username;
    }
    if (password) {
      user.password = password;
    }

    await user.save();

    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Delete representative
exports.deleteRepresentative = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
    
    if (!isAuthorizedToManage(req.user, user)) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to delete this account under your jurisdiction' });
    }

    await User.findByIdAndDelete(userId);
    res.status(200).json({ status: 'success', message: 'Account deleted successfully' });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Update status (pause/ban/activate)
exports.updateRepresentativeStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
    
    if (!isAuthorizedToManage(req.user, user)) {
      return res.status(403).json({ status: 'error', message: 'Not authorized under your jurisdiction' });
    }

    if (status === 'active') {
      user.isActive = true;
      user.identityLinkage = user.identityLinkage || {};
      user.identityLinkage.is_banned = false;
    } else if (status === 'paused') {
      user.isActive = false;
      user.identityLinkage = user.identityLinkage || {};
      user.identityLinkage.is_banned = false;
    } else if (status === 'banned') {
      user.isActive = false;
      user.identityLinkage = user.identityLinkage || {};
      user.identityLinkage.is_banned = true;
    }

    await user.save();
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

// Helper functions
const isAuthorizedToManage = (manager, targetUser) => {
  if (manager.role === 'national') return true;
  if (!targetUser.location || !manager.location) return false;

  const isMatched = (level) => isLocationMatch(manager.location, targetUser.location, level);

  if (manager.role === 'region') {
    return isMatched('region');
  }
  
  if (manager.role === 'zone') {
    return isMatched('region') && isMatched('zone');
  }
  
  if (manager.role === 'woreda') {
    return isMatched('region') && isMatched('zone') && isMatched('woreda');
  }
  
  return false;
};

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

const canActivateRole = (activatorRole, targetRole) => {
  const activationHierarchy = {
    'national': ['region'],
    'region': ['zone'],
    'zone': ['woreda'],
    'woreda': ['kebele'],
    'kebele': [],
    'citizen': []
  };

  return activationHierarchy[activatorRole]?.includes(targetRole) || false;
};

const getApprovableRoles = (userRole) => {
  const approvableRoles = {
    'national': ['region'],
    'region': ['zone'],
    'zone': ['woreda'],
    'woreda': ['kebele'],
    'kebele': [],
    'citizen': []
  };

  return approvableRoles[userRole] || [];
};

const validateLocationHierarchy = (creator, targetRole, targetLocation) => {
  // National can create regional representatives in any region
  if (creator.role === 'national') {
    return targetLocation.region !== '';
  }

  // Regional can create zonal representatives in their region
  if (creator.role === 'region') {
    return targetLocation.region === creator.location.region &&
      targetLocation.zone !== '';
  }

  // Zonal can create woreda representatives in their zone
  if (creator.role === 'zone') {
    return targetLocation.region === creator.location.region &&
      targetLocation.zone === creator.location.zone &&
      targetLocation.woreda !== '';
  }

  // Woreda can create kebele representatives in their woreda
  if (creator.role === 'woreda') {
    return targetLocation.region === creator.location.region &&
      targetLocation.zone === creator.location.zone &&
      targetLocation.woreda === creator.location.woreda &&
      targetLocation.kebele !== '';
  }

  return false;
};

const validateActivationHierarchy = (activator, targetUser) => {
  // National can activate any regional
  if (activator.role === 'national' && targetUser.role === 'region') {
    return true;
  }

  // Regional can activate zonals in their region
  if (activator.role === 'region' && targetUser.role === 'zone') {
    return targetUser.location.region === activator.location.region;
  }

  // Zonal can activate woredas in their zone
  if (activator.role === 'zone' && targetUser.role === 'woreda') {
    return targetUser.location.region === activator.location.region &&
      targetUser.location.zone === activator.location.zone;
  }

  // Woreda can activate kebeles in their woreda
  if (activator.role === 'woreda' && targetUser.role === 'kebele') {
    return targetUser.location.region === activator.location.region &&
      targetUser.location.zone === activator.location.zone &&
      targetUser.location.woreda === activator.location.woreda;
  }

  return false;
};