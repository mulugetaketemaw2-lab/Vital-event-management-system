const ReportTransmission = require('../models/ReportTransmission');
const User = require('../models/User');
const { notify } = require('../utils/notificationHelper');

// Send report to higher level
exports.sendReportToHigherLevel = async (req, res) => {
  try {
    const { reportData, reportType, reportLevel, period, notes } = req.body;
    const user = req.user;

    // Determine the next level in hierarchy
    let toLevel;
    if (user.role === 'citizen') {
      toLevel = 'woreda';
    } else if (user.role === 'kebele' || user.role === 'kebele_representative') {
      toLevel = 'woreda';
    } else if (user.role === 'woreda' || user.role === 'woreda_representative') {
      toLevel = 'zone';
    } else if (user.role === 'zone' || user.role === 'zone_representative') {
      toLevel = 'region';
    } else if (user.role === 'region' || user.role === 'region_representative') {
      toLevel = 'national';
    } else {
      return res.status(403).json({
        status: 'error',
        message: 'You cannot send reports to a higher level'
      });
    }

    // Find the recipient at the next level
    const recipientQuery = {
      role: { $in: [toLevel, `${toLevel}_representative`] }
    };

    // For non-national levels, filter by location
    if (toLevel !== 'national') {
      recipientQuery['location.region'] = user.location?.region || user.location?.regionName;
    }

    if (toLevel === 'zone') {
      recipientQuery['location.zone'] = user.location?.zone || user.location?.zoneName;
    } else if (toLevel === 'woreda') {
      // For kebele to woreda reports, filter by region, zone, and woreda
      recipientQuery['location.region'] = user.location?.region || user.location?.regionName;
      recipientQuery['location.zone'] = user.location?.zone || user.location?.zoneName;
      recipientQuery['location.woreda'] = user.location?.woreda || user.location?.woredaName;
    }

    const recipient = await User.findOne(recipientQuery);
    if (!recipient) {
      return res.status(404).json({
        status: 'error',
        message: `No ${toLevel} representative found for your area`
      });
    }

    // Generate unique report ID
    const reportId = `${reportLevel}-${user.location?.region || user.location?.regionName}-${reportType}-${Date.now()}`;

    // Create transmission record
    const transmission = new ReportTransmission({
      reportId,
      reportType,
      reportLevel,
      fromLevel: reportLevel,
      toLevel,
      fromLocation: user.location,
      toLocation: recipient.location,
      fromUser: user._id,
      toUser: recipient._id,
      period,
      reportData,
      notes
    });

    await transmission.save();

    console.log(`📤 Report sent from ${reportLevel} to ${toLevel}: ${reportId}`);

    // 1. Notify Sender
    await notify({
      recipient: user._id,
      type: 'system',
      category: 'success',
      message: `Your ${period} ${reportType} report has been sent to ${toLevel} successfully.`,
      data: { reportId }
    });

    // 2. Notify Recipient
    await notify({
      recipient: recipient._id,
      type: 'system',
      category: 'action_required',
      message: `New ${period} ${reportType} report received from ${reportLevel} (${user.location?.kebele || user.location?.woreda || user.location?.zone || user.location?.region}).`,
      data: { reportId }
    });

    res.status(200).json({
      status: 'success',
      message: `Report successfully sent to ${toLevel} level`,
      data: {
        reportId: transmission.reportId,
        sentTo: `${toLevel} representative`,
        transmittedAt: transmission.transmittedAt
      }
    });

  } catch (error) {
    console.error('Send report error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to send report'
    });
  }
};

// Get received reports for current user
exports.getReceivedReports = async (req, res) => {
  try {
    const user = req.user;
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { toUser: user._id };
    if (status) {
      query.status = status;
    }

    // Get transmissions
    const transmissions = await ReportTransmission.find(query)
      .populate('fromUser', 'personalInfo role location')
      .sort({ transmittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ReportTransmission.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        transmissions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get received reports error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch received reports'
    });
  }
};

// Get sent reports for current user
exports.getSentReports = async (req, res) => {
  try {
    const user = req.user;
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { fromUser: user._id };
    if (status) {
      query.status = status;
    }

    // Get transmissions
    const transmissions = await ReportTransmission.find(query)
      .populate('toUser', 'personalInfo role location')
      .sort({ transmittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ReportTransmission.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        transmissions,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get sent reports error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch sent reports'
    });
  }
};

// Mark report as received
exports.markReportAsReceived = async (req, res) => {
  try {
    const { reportId } = req.params;
    const user = req.user;

    const transmission = await ReportTransmission.findOne({
      reportId,
      toUser: user._id
    });

    if (!transmission) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found'
      });
    }

    transmission.status = 'received';
    transmission.receivedAt = new Date();
    await transmission.save();

    res.status(200).json({
      status: 'success',
      message: 'Report marked as received'
    });

  } catch (error) {
    console.error('Mark report as received error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update report status'
    });
  }
};

// Mark report as reviewed
exports.markReportAsReviewed = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { notes } = req.body;
    const user = req.user;

    const transmission = await ReportTransmission.findOne({
      reportId,
      toUser: user._id
    });

    if (!transmission) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found'
      });
    }

    transmission.status = 'reviewed';
    transmission.reviewedAt = new Date();
    if (notes) transmission.notes = notes;
    await transmission.save();

    res.status(200).json({
      status: 'success',
      message: 'Report marked as reviewed'
    });

  } catch (error) {
    console.error('Mark report as reviewed error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update report status'
    });
  }
};

// Get report details
exports.getReportDetails = async (req, res) => {
  try {
    const { reportId } = req.params;
    const user = req.user;

    const transmission = await ReportTransmission.findOne({
      reportId,
      $or: [
        { toUser: user._id },
        { fromUser: user._id }
      ]
    })
    .populate('fromUser', 'personalInfo role location')
    .populate('toUser', 'personalInfo role location');

    if (!transmission) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: transmission
    });

  } catch (error) {
    console.error('Get report details error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch report details'
    });
  }
};
