const User = require('../models/User');
const VitalEvent = require('../models/VitalEvent');
const { buildJurisdictionQuery } = require('../utils/locationHelper');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate Woreda reports
exports.generateWoredaReport = async (req, res) => {
  try {
    const user = req.user;

    // Only woreda representatives can generate reports
    if (!['woreda', 'woreda_representative'].includes(user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only woreda representatives can generate reports'
      });
    }

    const { reportType, startDate, endDate, format } = req.body;

    console.log('📈 Generating woreda report:', { reportType, startDate, endDate, format });

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Build jurisdiction filter for this woreda using shared logic
    const jurisdictionQuery = buildJurisdictionQuery(user.location, user.role);

    let reportData = {};

    if (reportType === 'citizens' || reportType === 'all') {
      const citizens = await User.find({
        role: 'citizen',
        isChild: { $ne: true },  // Exclude vital-event child accounts
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
        byKebele: citizens.reduce((acc, citizen) => {
          const kebele = citizen.location?.kebeleName || citizen.location?.kebele || 'Unknown';
          acc[kebele] = (acc[kebele] || 0) + 1;
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
        byKebele: events.reduce((acc, event) => {
          const kebele = event.location?.kebeleName || event.location?.kebele || 'Unknown';
          acc[kebele] = (acc[kebele] || 0) + 1;
          return acc;
        }, {}),
        details: events.map(event => ({
          fullName: event.birthDetails?.childName || event.deathDetails?.deceasedName || 
                    (event.marriageDetails ? `${event.marriageDetails.husbandName} & ${event.marriageDetails.wifeName}` : 'N/A'),
          eventType: event.type.toUpperCase(),
          registrationDate: event.createdAt,
          certificateNo: event.certificate?.number || 'N/A',
          gender: event.birthDetails?.gender || event.deathDetails?.gender || event.citizen?.personalInfo?.gender || 'N/A',
          location: `${event.location?.kebeleName || 'N/A'}`
        }))
      };
    }

    reportData.generatedAt = new Date();
    reportData.generatedBy = user.personalInfo?.firstName + ' ' + user.personalInfo?.lastName;
    reportData.woreda = user.location?.woreda || user.location?.woredaName;
    reportData.region = user.location?.region || user.location?.regionName;
    reportData.period = {
      startDate: startDate || 'All time',
      endDate: endDate || 'All time'
    };

    // Generate PDF if requested
    if (format === 'pdf') {
      await generateWoredaReportPDF(reportData, res);
    } else {
      res.status(200).json({
        status: 'success',
        message: 'Woreda report generated successfully',
        data: reportData
      });
    }

  } catch (error) {
    console.error('Generate woreda report error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to generate woreda report'
    });
  }
};

// Generate PDF report for Woreda
const generateWoredaReportPDF = async (reportData, res) => {
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Set headers for PDF download
    const filename = `woreda-report-${reportData.woreda}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    doc.pipe(res);

    // Helper function to add Ethiopian flag
    const addEthiopianFlag = (y) => {
      const flagWidth = 60;
      const flagHeight = 40;
      const flagX = 50;
      
      // Draw Ethiopian flag colors
      doc.fillColor('#009E49').rect(flagX, y, flagWidth, flagHeight / 3);
      doc.fillColor('#FCD116').rect(flagX, y + flagHeight / 3, flagWidth, flagHeight / 3);
      doc.fillColor('#EF3340').rect(flagX, y + 2 * flagHeight / 3, flagWidth, flagHeight / 3);
      
      // Add star in center
      doc.fillColor('#003399').circle(flagX + flagWidth / 2, y + flagHeight / 2, 6);
      doc.fillColor('#FCD116').fontSize(8).text('★', flagX + flagWidth / 2 - 4, y + flagHeight / 2 - 4);
      
      return y + flagHeight + 10;
    };

    // Add header
    let yPosition = addEthiopianFlag(50);
    doc.fontSize(18).font('Helvetica-Bold').text('FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA', 50, yPosition, { align: 'center' });
    yPosition += 25;
    doc.fontSize(14).font('Helvetica-Bold').text('VITAL EVENTS REGISTRATION SYSTEM', 50, yPosition, { align: 'center' });
    yPosition += 20;
    doc.fontSize(16).font('Helvetica-Bold').text('WOREDA LEVEL REPORT', 50, yPosition, { align: 'center' });
    yPosition += 30;

    // Add report metadata
    doc.fontSize(12).font('Helvetica-Bold').text('Report Information:');
    doc.fontSize(10).font('Helvetica').text(`Woreda: ${reportData.woreda}`);
    doc.text(`Region: ${reportData.region}`);
    doc.text(`Generated by: ${reportData.generatedBy}`);
    doc.text(`Generated on: ${reportData.generatedAt.toLocaleDateString()}`);
    doc.text(`Period: ${reportData.period.startDate} to ${reportData.period.endDate}`);
    yPosition += 50;

    // Add citizens data if available
    if (reportData.citizens) {
      doc.fontSize(14).font('Helvetica-Bold').text('CITIZEN REGISTRATION SUMMARY', { underline: true });
      yPosition += 20;
      
      doc.fontSize(11).font('Helvetica').text(`Total Citizens: ${reportData.citizens.total}`);
      doc.text(`Approved: ${reportData.citizens.approved}`);
      doc.text(`Rejected: ${reportData.citizens.rejected}`);
      doc.text(`Verified: ${reportData.citizens.verified}`);
      yPosition += 20;

      if (Object.keys(reportData.citizens.byKebele).length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Citizens by Kebele:');
        yPosition += 15;
        
        Object.entries(reportData.citizens.byKebele).forEach(([kebele, count]) => {
          doc.fontSize(10).font('Helvetica').text(`  ${kebele}: ${count}`);
          yPosition += 12;
        });
      }
      yPosition += 20;
    }

    // Add events data if available
    if (reportData.events) {
      doc.fontSize(14).font('Helvetica-Bold').text('VITAL EVENTS SUMMARY', { underline: true });
      yPosition += 20;
      
      doc.fontSize(11).font('Helvetica').text(`Total Events: ${reportData.events.total}`);
      doc.text(`Completed: ${reportData.events.completed}`);
      doc.text(`Rejected: ${reportData.events.rejected}`);
      yPosition += 20;

      if (Object.keys(reportData.events.byType).length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Events by Type:');
        yPosition += 15;
        
        Object.entries(reportData.events.byType).forEach(([type, count]) => {
          doc.fontSize(10).font('Helvetica').text(`  ${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}`);
          yPosition += 12;
        });
      }

      if (Object.keys(reportData.events.byKebele).length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Events by Kebele:');
        yPosition += 15;
        
        Object.entries(reportData.events.byKebele).forEach(([kebele, count]) => {
          doc.fontSize(10).font('Helvetica').text(`  ${kebele}: ${count}`);
          yPosition += 12;
        });
      }
    }

    // Add footer
    const footerY = doc.page.height - 50;
    doc.fontSize(8).font('Helvetica-Oblique').text('Official Report - Federal Democratic Republic of Ethiopia - Vital Events Registration System', 50, footerY, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Generate Woreda PDF report error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate PDF report'
    });
  }
};

// Get Woreda overview statistics
exports.getWoredaOverview = async (req, res) => {
  try {
    const user = req.user;

    // Only woreda representatives can access overview
    if (!['woreda', 'woreda_representative'].includes(user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Build jurisdiction filter for this woreda using shared logic
    const jurisdictionQuery = buildJurisdictionQuery(user.location, user.role);

    // Get citizens statistics
    const allCitizens = await User.find({
      role: 'citizen',
      isChild: { $ne: true },
      ...jurisdictionQuery
    });

    const citizensByStatus = {
      pending: allCitizens.filter(c => c.status === 'pending'),
      approved: allCitizens.filter(c => c.status === 'approved'),
      rejected: allCitizens.filter(c => ['rejected', 'rejected_woreda'].includes(c.status)),
      verified: allCitizens.filter(c => c.status === 'verified')
    };

    // Get events statistics
    const allEvents = await VitalEvent.find({
      ...jurisdictionQuery
    });

    const eventsByStatus = {
      pending: allEvents.filter(e => e.status === 'pending' || e.status === 'pending_woreda'),
      approved: allEvents.filter(e => e.status === 'completed'),
      rejected: allEvents.filter(e => e.status === 'rejected')
    };

    const stats = {
      citizens: {
        total: allCitizens.length,
        pending: citizensByStatus.pending.length,
        approved: citizensByStatus.approved.length,
        rejected: citizensByStatus.rejected.length,
        verified: citizensByStatus.verified.length
      },
      events: {
        total: allEvents.length,
        pending: eventsByStatus.pending.length,
        approved: eventsByStatus.approved.length,
        rejected: eventsByStatus.rejected.length
      }
    };

    console.log(`📊 Woreda overview (${user.location?.woreda}): ${stats.citizens.total} citizens, ${stats.events.total} events`);

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
    console.error('Get woreda overview error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch woreda overview'
    });
  }
};
