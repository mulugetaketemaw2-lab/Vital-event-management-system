const User = require('../models/User');
const VitalEvent = require('../models/VitalEvent');

// Get all reviewed citizens and events for national level (monitoring only)
exports.getNationalOverview = async (req, res) => {
  try {
    const user = req.user;

    // Only national representatives can access this
    if (user.role !== 'national') {
      return res.status(403).json({
        status: 'error',
        message: 'Only national representatives can access this endpoint'
      });
    }

    console.log('🏛️ National representative requesting overview data');

    // Get ALL self-registered citizens (exclude vital-event child accounts)
    const allCitizens = await User.find({
      role: 'citizen',
      isChild: { $ne: true },  // STRICT ISOLATION: child accounts created by birth events stay in Vital Events module only
      status: {
        $nin: ['pending', 'pending_verification', 'pending_woreda'] // Exclude ALL pending statuses
      }
    })
      .select('personalInfo location status verificationLevel createdAt verificationHistory kebeleApprovalDate woredaApprovalDate approvedAt rejectedAt isActive kebeleVerification woredaVerification documents idCard profilePhoto')
      .populate('verificationHistory.verifiedBy', 'personalInfo')
      .sort({ createdAt: -1 });

    // Group citizens by status
    const citizensByStatus = {
      approved: allCitizens.filter(c => c.status === 'approved'),
      rejected: allCitizens.filter(c => ['rejected', 'rejected_region', 'rejected_zone', 'rejected_woreda', 'rejected_kebele'].includes(c.status)),
      pending_review: allCitizens.filter(c => ['pending_woreda', 'pending_zone', 'pending_region', 'pending_national'].includes(c.status)),
      verified: allCitizens.filter(c => c.status === 'verified')
    };

    // Get ALL vital events (exclude ALL pending items - only show reviewed)
    const allEvents = await VitalEvent.find({
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

    console.log(`📊 National overview: ${stats.citizens.total} citizens, ${stats.events.total} events`);

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
    console.error('Get national overview error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch national overview'
    });
  }
};

// Generate national reports
exports.generateNationalReport = async (req, res) => {
  try {
    const user = req.user;

    // Only national representatives can generate reports
    if (user.role !== 'national') {
      return res.status(403).json({
        status: 'error',
        message: 'Only national representatives can generate reports'
      });
    }

    const { reportType, startDate, endDate } = req.body;

    console.log('📈 Generating national report:', { reportType, startDate, endDate });

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    let reportData = {};

    if (reportType === 'citizens' || reportType === 'all') {
      const citizens = await User.find({
        role: 'citizen',
        isChild: { $ne: true },  // STRICT ISOLATION: exclude vital-event child accounts
        ...dateFilter,
        status: {
          $nin: ['pending', 'pending_verification', 'pending_woreda', 'pending_zone', 'pending_region', 'pending_national']
        }
      }).select('personalInfo location status createdAt kebeleApprovalDate woredaApprovalDate');

      reportData.citizens = {
        total: citizens.length,
        approved: citizens.filter(c => c.status === 'approved').length,
        rejected: citizens.filter(c => ['rejected', 'rejected_region', 'rejected_zone', 'rejected_woreda', 'rejected_kebele'].includes(c.status)).length,
        verified: citizens.filter(c => c.status === 'verified').length,
        // Note: pending items are excluded from reports as requested
        byRegion: citizens.reduce((acc, citizen) => {
          const region = citizen.location?.regionName || 'Unknown';
          acc[region] = (acc[region] || 0) + 1;
          return acc;
        }, {})
      };
    }

    if (reportType === 'events' || reportType === 'all') {
      const events = await VitalEvent.find({
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
        byRegion: events.reduce((acc, event) => {
          const region = event.location?.region || 'Unknown';
          acc[region] = (acc[region] || 0) + 1;
          return acc;
        }, {}),
        details: events.map(event => ({
          fullName: event.birthDetails?.childName || event.deathDetails?.deceasedName || 
                    (event.marriageDetails ? `${event.marriageDetails.husbandName} & ${event.marriageDetails.wifeName}` : 'N/A'),
          eventType: event.type.toUpperCase(),
          registrationDate: event.createdAt,
          certificateNo: event.certificate?.number || 'N/A',
          gender: event.birthDetails?.gender || event.deathDetails?.gender || event.citizen?.personalInfo?.gender || 'N/A',
          location: `${event.location?.regionName || 'N/A'} > ${event.location?.zoneName || 'N/A'} > ${event.location?.woredaName || 'N/A'}`
        }))
      };
    }

    reportData.generatedAt = new Date();
    reportData.generatedBy = user.personalInfo?.firstName + ' ' + user.personalInfo?.lastName;
    reportData.period = {
      startDate: startDate || 'All time',
      endDate: endDate || 'All time'
    };

    console.log('✅ National report generated successfully');

    res.status(200).json({
      status: 'success',
      message: 'National report generated successfully',
      data: reportData
    });
  } catch (error) {
    console.error('Generate national report error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate report'
    });
  }
};
