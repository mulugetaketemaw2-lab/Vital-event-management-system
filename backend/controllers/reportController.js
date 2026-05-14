const Report = require('../models/Report');
const VitalEvent = require('../models/VitalEvent');

exports.generateReport = async (req, res) => {
  try {
    const { type, period } = req.body;
    const user = req.user;

    // Calculate date range based on report type
    const now = new Date();
    let startDate, endDate;

    if (type === 'daily') {
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
    } else if (type === 'weekly') {
      startDate = new Date(now.setDate(now.getDate() - 7));
      endDate = new Date();
    } else if (type === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
    }

    // Get events for the period and location
    const locationFilter = {};
    if (user.role === 'kebele' || user.role === 'kebele_representative') {
      locationFilter['$or'] = [
        { 'location.kebele': user.location.kebele },
        { 'location.kebeleCode': user.location.kebele }
      ];
      locationFilter['location.woreda'] = user.location.woreda;
    } else if (user.role === 'woreda' || user.role === 'woreda_representative') {
      locationFilter['$or'] = [
        { 'location.woreda': user.location.woreda },
        { 'location.woredaCode': user.location.woreda }
      ];
    } else if (user.role === 'zone' || user.role === 'zone_representative') {
      locationFilter['$or'] = [
        { 'location.zone': user.location.zone },
        { 'location.zoneCode': user.location.zone }
      ];
    } else if (user.role === 'region' || user.role === 'region_representative') {
      locationFilter['$or'] = [
        { 'location.region': user.location.region },
        { 'location.regionCode': user.location.region }
      ];
    }

    const events = await VitalEvent.find({
      ...locationFilter,
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Generate report content
    const reportContent = {
      totalEvents: events.length,
      eventsByType: events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1;
        return acc;
      }, {}),
      eventsByStatus: events.reduce((acc, event) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
      }, {}),
      details: events.map(event => ({
        fullName: event.birthDetails?.childName || event.deathDetails?.deceasedName || 
                  (event.marriageDetails ? `${event.marriageDetails.husbandName} & ${event.marriageDetails.wifeName}` : 'N/A'),
        eventType: event.type.toUpperCase(),
        registrationDate: event.createdAt,
        certificateNo: event.certificate?.number || 'N/A',
        gender: event.birthDetails?.gender || event.deathDetails?.gender || event.citizen?.personalInfo?.gender || 'N/A'
      }))
    };

    const report = await Report.create({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${user.role}`,
      type,
      period: { startDate, endDate },
      generatedBy: user.id,
      content: reportContent,
      status: 'draft'
    });

    res.status(201).json({
      status: 'success',
      data: {
        report
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.sendReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { sentTo } = req.body;

    const report = await Report.findByIdAndUpdate(
      reportId,
      { 
        sentTo,
        status: 'sent'
      },
      { new: true }
    );

    res.status(200).json({
      status: 'success',
      data: {
        report
      }
    });
  } catch (error) {
    console.error('Send report error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};