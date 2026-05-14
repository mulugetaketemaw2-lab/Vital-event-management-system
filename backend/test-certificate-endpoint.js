// Temporary test endpoint for certificate download debugging
// Add this to your server.js temporarily for testing

const express = require('express');
const router = express.Router();
const VitalEvent = require('./models/VitalEvent');
const PDFDocument = require('pdfkit');

router.get('/test-certificate/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST CERTIFICATE DOWNLOAD');
    console.log('='.repeat(60));
    console.log('Event ID:', eventId);
    console.log('Time:', new Date().toISOString());
    
    // Step 1: Find event
    console.log('\n📄 Step 1: Finding event...');
    const event = await VitalEvent.findById(eventId)
      .populate('citizen')
      .populate('verification.representative');
    
    if (!event) {
      console.log('❌ Event not found');
      return res.status(404).json({ error: 'Event not found' });
    }
    
    console.log('✅ Event found:', event.type);
    console.log('   Status:', event.status);
    console.log('   Has citizen:', !!event.citizen);
    console.log('   Has location:', !!event.location);
    console.log('   Verification count:', event.verification?.length || 0);
    
    // Step 2: Create simple PDF
    console.log('\n📋 Step 2: Creating PDF...');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="test-certificate-${eventId}.pdf"`);
    
    doc.pipe(res);
    
    // Step 3: Add content
    console.log('📝 Step 3: Adding content...');
    
    try {
      doc.fontSize(20).font('Helvetica-Bold').text('TEST CERTIFICATE', { align: 'center' });
      doc.moveDown(2);
      
      doc.fontSize(12).text(`Event ID: ${eventId}`);
      doc.text(`Event Type: ${event.type}`);
      doc.text(`Status: ${event.status}`);
      doc.moveDown(1);
      
      // Location
      if (event.location) {
        doc.fontSize(14).font('Helvetica-Bold').text('Location:');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Kebele: ${event.location.kebele || 'N/A'}`);
        doc.text(`Woreda: ${event.location.woreda || 'N/A'}`);
        doc.text(`Zone: ${event.location.zone || 'N/A'}`);
        doc.text(`Region: ${event.location.region || 'N/A'}`);
        doc.moveDown(1);
      }
      
      // Verification
      if (event.verification && event.verification.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Approvals:');
        doc.fontSize(11).font('Helvetica');
        event.verification.forEach((ver, i) => {
          doc.text(`${i + 1}. ${ver.level}: ${ver.officerName || 'N/A'} - ${ver.status}`);
        });
        doc.moveDown(1);
      }
      
      // Birth details
      if (event.type === 'birth' && event.birthDetails) {
        doc.fontSize(14).font('Helvetica-Bold').text('Birth Details:');
        doc.fontSize(11).font('Helvetica');
        doc.text(`Child: ${event.birthDetails.childName || 'N/A'}`);
        doc.text(`Father: ${event.birthDetails.fatherName || 'N/A'}`);
        doc.text(`Mother: ${event.birthDetails.motherName || 'N/A'}`);
      }
      
      console.log('✅ Content added successfully');
      
    } catch (contentError) {
      console.error('❌ Error adding content:', contentError);
      doc.text('Error generating content: ' + contentError.message);
    }
    
    // Step 4: Finalize
    console.log('🏁 Step 4: Finalizing PDF...');
    doc.end();
    console.log('✅ PDF sent successfully');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ TEST CERTIFICATE ERROR:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('='.repeat(60) + '\n');
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Test certificate generation failed',
        message: error.message,
        stack: error.stack
      });
    }
  }
});

module.exports = router;

// To use this, add to your server.js:
// const testCertificateRouter = require('./test-certificate-endpoint');
// app.use('/api', testCertificateRouter);
