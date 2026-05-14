const User = require('../models/User');
const VitalEvent = require('../models/VitalEvent');

// Get approved and rejected citizens for regional level monitoring
exports.getRegionalOverview = async (req, res) => {
  try {
    const user = req.user;

    // Only regional representatives can access this
    if (user.role !== 'region' && user.role !== 'region_representative') {
      return res.status(403).json({
        status: 'error',
        message: 'Only regional representatives can access this endpoint'
      });
    }

    console.log('🏛️ Regional representative requesting overview data');

    const region = user.location?.region;
    const regionName = user.location?.regionName;

    if (!region && !regionName) {
      return res.status(400).json({
        status: 'error',
        message: 'Your account is not assigned to a region'
      });
    }

    const jurisdictionQuery = {
      role: 'citizen',
      isChild: { $ne: true },  // STRICT ISOLATION: exclude vital-event child accounts
      $or: [
        { 'location.region': region },
        { 'location.region': regionName },
        { 'location.regionName': region },
        { 'location.regionName': regionName }
      ]
    };

    console.log(`🔍 Regional query for ${region || regionName}:`, JSON.stringify(jurisdictionQuery, null, 2));

    // Get ONLY approved and rejected citizens in this region
    const allCitizens = await User.find({
      $and: [
        jurisdictionQuery,
        { status: { $in: ['approved', 'rejected', 'rejected_region', 'verified'] } }
      ]
    })
      .select('personalInfo location status verificationLevel createdAt verificationHistory approvedAt rejectedAt isActive kebeleVerification woredaVerification documents idCard profilePhoto')
      .populate('verificationHistory.verifiedBy', 'personalInfo')
      .sort({ createdAt: -1 });

    // Group citizens by status
    const citizensByStatus = {
      approved: allCitizens.filter(c => c.status === 'approved'),
      rejected: allCitizens.filter(c => ['rejected', 'rejected_region', 'rejected_zone', 'rejected_woreda', 'rejected_kebele'].includes(c.status)),
      verified: allCitizens.filter(c => c.status === 'verified')
    };

    // Build a strict query for vital events in this region
    const eventLocationQuery = {
      $or: [
        { 'location.region': region },
        { 'location.region': regionName },
        { 'location.regionName': region },
        { 'location.regionName': regionName }
      ].filter(cond => Object.values(cond)[0] != null && Object.values(cond)[0] !== '')
    };

    if (eventLocationQuery.$or.length === 0) {
      eventLocationQuery.$or = [{ 'location.region': '__NON_EXISTENT__' }];
    }

    // Get approved, rejected, and pending vital events in this region
    const allEvents = await VitalEvent.find({
      ...eventLocationQuery,
      status: {
        $in: ['completed', 'approved', 'rejected', 'pending_zone', 'pending_region', 'pending_national']
      }
    })
      .populate('citizen', 'personalInfo status location')
      .populate('registeredUser', 'personalInfo status')
      .populate('verification.representative', 'personalInfo')
      .sort({ createdAt: -1 });

    // Group events by status
    const eventsByStatus = {
      pending: [],
      approved: allEvents.filter(e => ['completed', 'approved', 'pending_zone', 'pending_region', 'pending_national'].includes(e.status)),
      rejected: allEvents.filter(e => e.status === 'rejected' || e.status.startsWith('rejected_'))
    };

    // Calculate statistics
    const stats = {
      citizens: {
        total: allCitizens.length,
        approved: citizensByStatus.approved.length,
        rejected: citizensByStatus.rejected.length,
        verified: citizensByStatus.verified.length
      },
      events: {
        total: allEvents.length,
        completed: eventsByStatus.approved.length,
        rejected: eventsByStatus.rejected.length
      }
    };

    console.log(`📊 Regional overview (${user.location?.region}): ${stats.citizens.total} citizens, ${stats.events.total} events`);

    res.status(200).json({
      status: 'success',
      data: {
        citizens: allCitizens,
        events: allEvents,
        citizensByStatus,
        eventsByStatus,
        stats
      }
    });
  } catch (error) {
    console.error('Get regional overview error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch regional overview'
    });
  }
};

// Generate regional reports
exports.generateRegionalReport = async (req, res) => {
  try {
    const user = req.user;

    // Only regional representatives can generate reports
    if (user.role !== 'region' && user.role !== 'region_representative') {
      return res.status(403).json({
        status: 'error',
        message: 'Only regional representatives can generate reports'
      });
    }

    const { reportType, startDate, endDate } = req.body;

    console.log('📈 Generating regional report:', { reportType, startDate, endDate });

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Build jurisdiction filter for this region
    const jurisdictionQuery = {
      'location.region': user.location?.region || user.location?.regionName
    };

    let reportData = {};

    if (reportType === 'citizens' || reportType === 'all') {
      const citizens = await User.find({
        role: 'citizen',
        isChild: { $ne: true },  // STRICT ISOLATION: exclude vital-event child accounts
        ...jurisdictionQuery,
        ...dateFilter,
        status: {
          $nin: ['pending', 'pending_verification', 'pending_woreda', 'pending_zone', 'pending_region', 'pending_national']
        }
      }).select('personalInfo location status createdAt kebeleApprovalDate woredaApprovalDate');

      reportData.citizens = {
        total: citizens.length,
        approved: citizens.filter(c => c.status === 'approved').length,
        rejected: citizens.filter(c => ['rejected', 'rejected_woreda'].includes(c.status)).length,
        verified: citizens.filter(c => c.status === 'verified').length,
        // Note: pending items are excluded from reports as requested
        byWoreda: citizens.reduce((acc, citizen) => {
          const woreda = citizen.location?.woredaName || 'Unknown';
          acc[woreda] = (acc[woreda] || 0) + 1;
          return acc;
        }, {})
      };
    }

    if (reportType === 'events' || reportType === 'all') {
      const events = await VitalEvent.find({
        ...jurisdictionQuery,
        ...dateFilter,
        status: {
          $nin: ['pending', 'pending_woreda', 'pending_zone', 'pending_region', 'pending_national']
        }
      }).populate('citizen', 'personalInfo');

      reportData.events = {
        total: events.length,
        completed: events.filter(e => e.status === 'completed').length,
        rejected: events.filter(e => e.status === 'rejected').length,
        // Note: pending events are excluded from reports as requested
        byType: events.reduce((acc, event) => {
          acc[event.type] = (acc[event.type] || 0) + 1;
          return acc;
        }, {}),
        byWoreda: events.reduce((acc, event) => {
          const woreda = event.location?.woredaName || 'Unknown';
          acc[woreda] = (acc[woreda] || 0) + 1;
          return acc;
        }, {}),
        details: events.map(event => ({
          fullName: event.birthDetails?.childName || event.deathDetails?.deceasedName || 
                    (event.marriageDetails ? `${event.marriageDetails.husbandName} & ${event.marriageDetails.wifeName}` : 'N/A'),
          eventType: event.type.toUpperCase(),
          registrationDate: event.createdAt,
          certificateNo: event.certificate?.number || 'N/A',
          gender: event.birthDetails?.gender || event.deathDetails?.gender || event.citizen?.personalInfo?.gender || 'N/A',
          location: `${event.location?.woredaName || 'N/A'} > ${event.location?.kebeleName || 'N/A'}`
        }))
      };
    }

    reportData.generatedAt = new Date();
    reportData.generatedBy = user.personalInfo?.firstName + ' ' + user.personalInfo?.lastName;
    reportData.region = user.location?.region || user.location?.regionName;
    reportData.period = {
      startDate: startDate || 'All time',
      endDate: endDate || 'All time'
    };

    console.log('✅ Regional report generated successfully');

    res.status(200).json({
      status: 'success',
      message: 'Regional report generated successfully',
      data: reportData
    });
  } catch (error) {
    console.error('Generate regional report error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate report'
    });
  }
};
