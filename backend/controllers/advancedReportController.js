const VitalEvent = require('../models/VitalEvent');
const User = require('../models/User');
const { generateExcelReport } = require('../utils/excelGenerator');

/**
 * Get date range for a specific period
 */
const getDateRange = (period, customStart, customEnd) => {
  const now = new Date();
  let start, end;

  if (customStart && customEnd) {
    return {
      start: new Date(new Date(customStart).setHours(0, 0, 0, 0)),
      end: new Date(new Date(customEnd).setHours(23, 59, 59, 999))
    };
  }

  switch (period.toLowerCase()) {
    case 'daily':
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'weekly':
      // Start of week (Sunday)
      const day = now.getDay();
      start = new Date(now.setDate(now.getDate() - day));
      start.setHours(0, 0, 0, 0);
      end = new Date();
      break;
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'semi-annual':
      // Last 6 months
      start = new Date();
      start.setMonth(start.getMonth() - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      break;
    case 'yearly':
    case 'annual':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
  }
  return { start, end };
};

/**
 * Main function to generate the standardized report
 */
exports.generateStandardizedReport = async (req, res) => {
  try {
    const { period } = req.params; 
    const { startDate, endDate } = req.query; // For custom ranges
    const user = req.user;
    const { start, end } = getDateRange(period, startDate, endDate);

    // 1. Build Location Filter based on role
    let locationFilter = {};
    let path = "";

    if (user.role === 'kebele') {
      locationFilter = { 'location.kebele': user.location.kebele };
      path = `${user.location.regionName} > ${user.location.zoneName} > ${user.location.woredaName} > ${user.location.kebeleName}`;
    } else if (user.role === 'woreda') {
      locationFilter = { 'location.woreda': user.location.woreda };
      path = `${user.location.regionName} > ${user.location.zoneName} > ${user.location.woredaName}`;
    } else if (user.role === 'zone') {
      locationFilter = { 'location.zone': user.location.zone };
      path = `${user.location.regionName} > ${user.location.zoneName}`;
    } else if (user.role === 'region') {
      locationFilter = { 'location.region': user.location.region };
      path = `${user.location.regionName}`;
    } else if (user.role === 'national') {
      locationFilter = {}; // National sees all
      path = "FEDERAL / NATIONAL LEVEL (ETHIOPIA)";
    }

    // 2. Fetch Data
    // A. Vital Events
    const events = await VitalEvent.find({
      ...locationFilter,
      createdAt: { $gte: start, $lte: end }
    }).populate('citizen');

    // B. New Citizen Registrations (User model, role 'citizen')
    // These are often "Birth" events that create a user, but let's check for any direct User creations too
    const newCitizens = await User.find({
      role: 'citizen',
      ...locationFilter,
      createdAt: { $gte: start, $lte: end }
    });

    // 3. Aggregate Summary Data
    const summaryMap = {
      birth: { type: 'Birth', total: 0, male: 0, female: 0 },
      death: { type: 'Death', total: 0, male: 0, female: 0 },
      marriage: { type: 'Marriage', total: 0, male: 0, female: 0 },
      divorce: { type: 'Divorce', total: 0, male: 0, female: 0 },
      adoption: { type: 'Adoption', total: 0, male: 0, female: 0 },
      new_citizen: { type: 'Citizen ID Registration', total: 0, male: 0, female: 0 }
    };

    // Calculate from VitalEvents
    events.forEach(event => {
      if (summaryMap[event.type]) {
        summaryMap[event.type].total++;
        // Try to get gender based on details
        const gender = event.birthDetails?.gender || event.deathDetails?.gender || event.citizen?.personalInfo?.gender;
        if (gender === 'Male' || gender === 'male' || gender === 'M') summaryMap[event.type].male++;
        if (gender === 'Female' || gender === 'female' || gender === 'F') summaryMap[event.type].female++;
      }
    });

    // Calculate from New Citizens
    summaryMap.new_citizen.total = newCitizens.length;
    newCitizens.forEach(c => {
      const g = c.personalInfo?.gender;
      if (g === 'Male' || g === 'male' || g === 'M') summaryMap.new_citizen.male++;
      if (g === 'Female' || g === 'female' || g === 'F') summaryMap.new_citizen.female++;
    });

    const summaryData = Object.values(summaryMap).filter(s => s.total > 0);

    // 4. Compile Registrant Details
    const detailsData = [];

    // Add Events to details
    events.forEach(event => {
      detailsData.push({
        fullName: event.birthDetails?.childName || event.deathDetails?.deceasedName || 
                  (event.marriageDetails ? `${event.marriageDetails.husbandName} & ${event.marriageDetails.wifeName}` : 'N/A'),
        eventType: event.type.toUpperCase(),
        registrationDate: event.createdAt,
        certificateNo: event.certificate?.number || 'N/A',
        representativeId: event.verification?.[0]?.officerName || 'System',
        gender: event.birthDetails?.gender || event.deathDetails?.gender || event.citizen?.personalInfo?.gender || 'N/A',
        kebele: event.location?.kebele || 'N/A',
        woreda: event.location?.woreda || 'N/A',
        zone: event.location?.zone || 'N/A',
        region: event.location?.region || 'N/A'
      });
    });

    // Add Citizens to details (if not already counted via Birth events)
    const birthEventCitizenIds = events.filter(e => e.type === 'birth' && e.citizen).map(e => e.citizen._id?.toString() || e.citizen.toString());
    
    newCitizens.forEach(citizen => {
      if (!birthEventCitizenIds.includes(citizen._id.toString())) {
        detailsData.push({
          fullName: `${citizen.personalInfo?.firstName || ''} ${citizen.personalInfo?.lastName || ''}`.trim() || citizen.username,
          eventType: 'ID REGISTRATION',
          registrationDate: citizen.createdAt,
          certificateNo: citizen.personalInfo?.idNumber || 'N/A',
          representativeId: 'System',
          gender: citizen.personalInfo?.gender || 'N/A',
          kebele: citizen.location?.kebele || 'N/A',
          woreda: citizen.location?.woreda || 'N/A',
          zone: citizen.location?.zone || 'N/A',
          region: citizen.location?.region || 'N/A'
        });
      }
    });

    // 5. Generate Excel
    const reportData = {
      metadata: {
        level: user.role.toUpperCase(),
        period: period.toUpperCase(),
        path: path
      },
      summary: summaryData,
      details: detailsData
    };

    await generateExcelReport(reportData, res);

  } catch (error) {
    console.error('Standardized Report Error:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};
