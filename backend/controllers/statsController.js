const User = require('../models/User');
const VitalEvent = require('../models/VitalEvent');
const { getRegex, convertLocationCodesToNames, convertLocationNamesToCodes, buildJurisdictionQuery } = require('../utils/locationHelper');

// ─── Helper: Build date range for each period ───────────────────────────────
const buildDateRange = (period) => {
  const now = new Date();
  let startDate;
  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'weekly': {
      const day = now.getDay(); // 0 = Sun
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case 'annually':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    default:
      startDate = null;
  }
  return startDate ? { $gte: startDate, $lte: now } : null;
};

// ─── National Statistics (time-series breakdown) ─────────────────────────────
exports.getNationalStatistics = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'national') {
      return res.status(403).json({
        status: 'error',
        message: 'Only national representatives can access national statistics'
      });
    }

    const periods = ['daily', 'weekly', 'monthly', 'annually'];
    const result = {};

    for (const period of periods) {
      const dateRange = buildDateRange(period);
      const dateFilter = dateRange ? { createdAt: dateRange } : {};

      // ── Citizen Registrations (self-registered only; not vital-event child accounts) ──
      const citizenQuery = { role: 'citizen', isChild: { $ne: true }, ...dateFilter };

      const [
        totalCitizens,
        approvedCitizens,
        pendingCitizens,
        rejectedCitizens
      ] = await Promise.all([
        User.countDocuments(citizenQuery),
        User.countDocuments({ ...citizenQuery, status: { $in: ['approved', 'verified'] } }),
        User.countDocuments({ ...citizenQuery, status: { $regex: /^pending/ } }),
        User.countDocuments({ ...citizenQuery, status: { $regex: /^rejected/ } })
      ]);

      // ── Vital Events ───────────────────────────────────────────────────────
      const eventQuery = { ...dateFilter };

      const [
        totalEvents,
        completedEvents,
        pendingEvents,
        rejectedEvents,
        birthEvents,
        deathEvents,
        marriageEvents,
        divorceEvents
      ] = await Promise.all([
        VitalEvent.countDocuments(eventQuery),
        VitalEvent.countDocuments({ ...eventQuery, status: { $in: ['completed', 'approved', 'pending_zone', 'pending_region', 'pending_national'] } }),
        VitalEvent.countDocuments({ ...eventQuery, status: { $regex: /^pending/ } }),
        VitalEvent.countDocuments({ ...eventQuery, status: 'rejected' }),
        VitalEvent.countDocuments({ ...eventQuery, type: 'birth' }),
        VitalEvent.countDocuments({ ...eventQuery, type: 'death' }),
        VitalEvent.countDocuments({ ...eventQuery, type: 'marriage' }),
        VitalEvent.countDocuments({ ...eventQuery, type: 'divorce' })
      ]);

      result[period] = {
        citizens: {
          total: totalCitizens,
          approved: approvedCitizens,
          pending: pendingCitizens,
          rejected: rejectedCitizens
        },
        events: {
          total: totalEvents,
          completed: completedEvents,
          pending: pendingEvents,
          rejected: rejectedEvents,
          byType: { birth: birthEvents, death: deathEvents, marriage: marriageEvents, divorce: divorceEvents }
        },
        aggregate: {
          total: totalCitizens + totalEvents,
          approved: approvedCitizens + completedEvents,
          pending: pendingCitizens + pendingEvents,
          rejected: rejectedCitizens + rejectedEvents
        }
      };
    }

    // ─── National Activity Trends (Last 6 Months) ───
    const trends = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Fetch all records for the last 6 months once to process in memory
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1);
    
    const [allCitizens, allEvents] = await Promise.all([
      User.find({ role: 'citizen', isChild: { $ne: true }, createdAt: { $gte: sixMonthsAgo } }).select('createdAt status'),
      VitalEvent.find({ createdAt: { $gte: sixMonthsAgo } }).select('createdAt status')
    ]);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const mLabel = months[d.getMonth()]; const yr = d.getFullYear(); const m = d.getMonth();
      
      const monCits = allCitizens.filter(c => { const dt = new Date(c.createdAt); return dt.getMonth() === m && dt.getFullYear() === yr; });
      const monEvts = allEvents.filter(e => { const dt = new Date(e.createdAt); return dt.getMonth() === m && dt.getFullYear() === yr; });
      
      trends.push({
        name: mLabel,
        citizens: monCits.length,
        events: monEvts.length,
        approved: monCits.filter(c => c.status === 'approved' || c.status === 'verified').length + 
                  monEvts.filter(e => e.status === 'completed' || e.status === 'approved').length
      });
    }

    res.status(200).json({
      status: 'success',
      data: { 
        statistics: result, 
        trends,
        generatedAt: new Date() 
      }
    });
  } catch (error) {
    console.error('getNationalStatistics error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// Helper function for roles
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

exports.getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    console.log(`📊 Fetching stats for user: ${user.username}, role: ${user.role}`);

    let stats = {
      totalEvents: 0,
      pendingEvents: 0,
      approvedEvents: 0,
      rejectedEvents: 0,
      completedEvents: 0,
      totalRepresentatives: 0,
      pendingApprovals: 0
    };

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

    const query = buildJurisdictionQuery(user.location, normalizedRole);
    console.log('🔍 Shared Jurisdiction Query:', JSON.stringify(query, null, 2));

    const buildSearch = (statusQuery) => {
      // Ensure jurisdiction query is always included
      return { $and: [query, statusQuery] };
    };

    if (user.role === 'citizen') {
        // Citizen stats: events they registered OR events about them (child accounts)
        const events = await VitalEvent.find({ citizen: user._id });
        stats.totalEvents = events.length;
        stats.pendingEvents = events.filter(e => e.status !== 'completed' && e.status !== 'rejected' && !e.certificate?.number).length;
        stats.approvedEvents = events.filter(e => e.certificate?.number || e.status === 'completed' || e.status === 'approved').length;
        stats.rejectedEvents = events.filter(e => e.status === 'rejected').length;
        stats.completedEvents = events.filter(e => e.status === 'completed').length;
      } else {
        // Representative stats- based on jurisdiction location, not username
        stats.totalEvents = await VitalEvent.countDocuments(query);

        // What needs this rep's action right now
        stats.pendingEvents = await VitalEvent.countDocuments(buildSearch({
          currentLevel: normalizedRole,
          status: { $in: ['pending', `pending_${normalizedRole}`, 'pending_verification'] }
        }));

        // Outcomes produced by this level (lookup in verification history)
        stats.approvedEvents = await VitalEvent.countDocuments(buildSearch({
          'verification.level': normalizedRole,
          'verification.status': 'approved'
        }));

        stats.rejectedEvents = await VitalEvent.countDocuments(buildSearch({
          'verification.level': normalizedRole,
          'verification.status': 'rejected'
        }));

        stats.completedEvents = await VitalEvent.countDocuments(buildSearch({
          status: { $in: ['completed', 'approved', 'pending_zone', 'pending_region', 'pending_national'] }
        }));

        // Get representatives under this jurisdiction
        const approvableRoles = getApprovableRoles(normalizedRole);
        const repQuery = buildSearch({ role: { $in: approvableRoles } });
        const representatives = await User.find(repQuery).select('isActive');

        stats.totalRepresentatives = representatives.length;
        stats.pendingApprovals = representatives.filter(r => !r.isActive).length;

        // Citizen stats for this jurisdiction
        stats.totalCitizens = await User.countDocuments({ role: 'citizen', ...query });
        stats.pendingCitizens = await User.countDocuments({ 
          role: 'citizen', 
          ...query, 
          status: { $in: ['pending', 'pending_verification', 'pending_woreda'] } 
        });
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