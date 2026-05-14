const User = require('../models/User');
const VitalEvent = require('../models/VitalEvent');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const axios = require('axios');

/**
 * Validates and converts image to a format PDFKit can handle (JPEG/PNG)
 * Especially useful for .avif files which are not natively supported by PDFKit
 * @param {string} imagePath 
 * @returns {Promise<Buffer|null>}
 */
const getSafeImageBuffer = async (imagePath) => {
  if (!fs.existsSync(imagePath)) return null;
  try {
    // Check file size first
    const stats = fs.statSync(imagePath);
    if (stats.size === 0) return null;

    // ALWAYS use sharp to normalize and validate the image.
    // This fixes "Attempt to access memory outside buffer bounds" for corrupt or problematic JPEGs/PNGs
    // by re-encoding them into a clean, predictable format that PDFKit can safely parse.
    const buffer = await sharp(imagePath)
      .rotate() // Handle EXIF orientation
      .toFormat('jpeg', { quality: 90 })
      .toBuffer();
    
    if (buffer && buffer.length > 0) {
      return buffer;
    }
    return null;
  } catch (err) {
    console.error(`Error processing image ${imagePath}:`, err.message);
    
    // Fallback: only if sharp fails, try raw read for absolute standard types, but with size check
    try {
      const ext = path.extname(imagePath).toLowerCase();
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        const raw = fs.readFileSync(imagePath);
        return (raw && raw.length > 0) ? raw : null;
      }
    } catch (e) { }
    return null;
  }
};

/**
 * Draws a professional decorative frame around the certificate
 * @param {Object} doc - PDFDocument instance
 */
const drawCertificateFrame = (doc) => {
  const margin = 20;
  const width = doc.page.width - 2 * margin;
  const height = doc.page.height - 2 * margin;

  // Outer thick border
  doc.save();
  doc.rect(margin, margin, width, height)
    .lineWidth(3)
    .stroke('#2d3748');

  // Inner decorative line
  doc.rect(margin + 6, margin + 6, width - 12, height - 12)
    .lineWidth(0.8)
    .stroke('#cbd5e0');

  // Corner accents
  const padding = 5;
  const dots = [
    { x: margin + padding, y: margin + padding },
    { x: margin + width - padding, y: margin + padding },
    { x: margin + padding, y: margin + height - padding },
    { x: margin + width - padding, y: margin + height - padding }
  ];

  dots.forEach(d => {
    doc.circle(d.x, d.y, 4).fill('#2d3748');
  });
  doc.restore();
};

/**
 * Downloads and renders a QR code image from the provided URL onto the PDF
 * @param {Object} doc - PDFDocument instance
 * @param {string} qrUrl - URL of the QR code image
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} size - Square size of the QR code
 */
const renderQRCode = async (doc, qrUrl, x, y, size = 60) => {
  if (!qrUrl) return;
  try {
    const response = await axios.get(qrUrl, { 
      responseType: 'arraybuffer',
      timeout: 5000,
      headers: { 'Accept': 'image/*' }
    });
    let buffer = Buffer.from(response.data);
    
    // Normalize QR code image to ensure PDFKit compatibility
    if (buffer.length > 0) {
      try {
        buffer = await sharp(buffer).png().toBuffer();
      } catch (sharpErr) {
        console.warn('QR sharp normalization failed, using raw buffer');
      }
      doc.image(buffer, x, y, { width: size, height: size });
    }
  } catch (err) {
    console.warn(`Warning: Could not render QR Code from ${qrUrl}:`, err.message);
  }
};

/**
 * Standard header for all official certificates
 */
const renderStandardHeader = (doc, title) => {
  const flagW = 60;
  const flagH = 36;
  const flagX = (doc.page.width - flagW) / 2;

  // Ethiopia Flag
  doc.save();
  doc.rect(flagX, 35, flagW, flagH / 3).fill('#009E49');
  doc.rect(flagX, 35 + flagH / 3, flagW, flagH / 3).fill('#FCD116');
  doc.rect(flagX, 35 + (2 * flagH / 3), flagW, flagH / 3).fill('#EF3340');

  // Blue circle with star in flag
  doc.circle(flagX + flagW / 2, 35 + flagH / 2, 6).fill('#003399');
  doc.restore();

  doc.moveDown(3);
  doc.fillColor('#1a202c').fontSize(16).font('Helvetica-Bold').text('FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('VITAL EVENTS REGISTRATION AGENCY', { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#2c5282').text(title.toUpperCase(), { align: 'center', underline: true });
  doc.fillColor('black');
  doc.moveDown(1.5);
};

const getIssuingLabel = (event) => {
  const levels = Array.isArray(event?.verification) ? event.verification : [];
  const woredaApproved = levels.some(v => v?.level === 'woreda' && v?.status === 'approved');
  if (woredaApproved) return 'WOREDA REPRESENTATIVE';
  return 'REPRESENTATIVE';
};

/**
 * Renders a professional signature block (seal + digital signature image + officer name)
 * for a given verification record onto the PDF at the specified X position.
 * @param {Object} doc  - PDFKit document
 * @param {Object} ver  - verification record { officerName, seal, signature, level, reviewedAt, verifiedAt }
 * @param {number} x    - left X position
 * @param {number} y    - top Y position
 * @param {string} basePath - __dirname + '/..' base
 */
const renderSignatureBlock = async (doc, ver, x, y, basePath) => {
  try {
    const blockW = 150;
    const labelY = y;

    // Level label with professional styling
    const levelLabel = (ver.level || '').toUpperCase() + ' LEVEL';
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#2d3748')
      .text(levelLabel, x, labelY, { width: blockW, align: 'center' });

    let imgY = labelY + 14;

    // Seal/Stamp image (if available)
    if (ver.seal && ver.seal.url) {
      try {
        const sealPath = path.join(basePath, ver.seal.url);
        const sealBuffer = await getSafeImageBuffer(sealPath);
        if (sealBuffer && sealBuffer.length > 0) {
          doc.image(sealBuffer, x + (blockW - 45) / 2, imgY, { width: 45, height: 45 });
          imgY += 48;
        } else {
          imgY += 48;
        }
      } catch (sealErr) {
        console.warn(`Warning: Could not load seal for ${ver.level}:`, sealErr.message);
        imgY += 48;
      }
    } else {
      // Spacer for missing seal
      imgY += 48;
    }

    // Digital signature image
    if (ver.signature && ver.signature.url) {
      try {
        const sigPath = path.join(basePath, ver.signature.url);
        const sigBuffer = await getSafeImageBuffer(sigPath);
        if (sigBuffer && sigBuffer.length > 0) {
          doc.image(sigBuffer, x + 10, imgY, { width: blockW - 20, height: 30 });
          imgY += 34;
        } else {
          imgY += 34;
        }
      } catch (sigErr) {
        console.warn(`Warning: Could not load signature for ${ver.level}:`, sigErr.message);
        imgY += 34;
      }
    } else {
      // Spacer for missing signature
      imgY += 34;
    }

    // Officer name with emphasis
    const officerName = ver.officerName || 'Official Representative';
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a202c')
      .text(officerName, x, imgY, { width: blockW, align: 'center' });
    imgY += 12;

    // Approval verification details
    const approvalDate = ver.verifiedAt || ver.reviewedAt;
    if (approvalDate) {
      doc.fontSize(7).font('Helvetica').fillColor('#718096')
        .text(`DATE: ${new Date(approvalDate).toLocaleDateString()}`, x, imgY, { width: blockW, align: 'center' });
    }

    doc.fillColor('black');
  } catch (error) {
    console.error(`Error rendering signature block for ${ver?.level}:`, error.message);
    // Continue without throwing
  }
};

/**
 * Renders ALL verification-level signature blocks side by side at the current
 * cursor position. Covers kebele, woreda, zone, region, national levels.
 * Displays ALL registrant information including stamps, names, and signatures.
 * @param {Object} doc      - PDFKit document
 * @param {Array}  verArr   - event.verification array
 * @param {string} basePath - path.join(__dirname, '..')
 */
const renderAllSignatureBlocks = async (doc, verArr, basePath) => {
  try {
    // Ensure verArr is an array
    if (!Array.isArray(verArr)) {
      verArr = [];
    }

    // Deduplicate approvals to show only the latest per level (fixes redundant Woreda/Kebele seals)
    const approvedLevelsMap = new Map();
    verArr
      .filter(v => v && v.status === 'approved')
      .forEach(v => {
        approvedLevelsMap.set(v.level, v); // Overwrites previous entry with same level
      });
    const approvedLevels = Array.from(approvedLevelsMap.values());

    if (approvedLevels.length === 0) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#999999')
        .text('No official authentication recorded.', { align: 'center' });
      doc.fillColor('black');
      return;
    }

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2d3748')
      .text('OFFICIAL AUTHENTICATION & SEAL', { underline: true });
    doc.moveDown(0.2);

    const startY = doc.y;
    const blockSpacing = 170;
    const perRow = 3;
    const rowHeight = 145; // Ample space for multi-stage approvals

    for (let i = 0; i < approvedLevels.length; i++) {
      try {
        const ver = approvedLevels[i];
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = 50 + col * blockSpacing;
        const y = startY + row * rowHeight;
        await renderSignatureBlock(doc, ver, x, y, basePath);
      } catch (blockError) {
        console.error(`Error rendering signature block ${i}:`, blockError.message);
      }
    }

    const totalRows = Math.ceil(approvedLevels.length / perRow);
    doc.y = startY + (totalRows * rowHeight) + 10;
  } catch (error) {
    console.error('Error in renderAllSignatureBlocks:', error.message);
    // Don't throw - allow PDF generation to continue
  }
};

/**
 * High-level helper to render the authentication section (all level seals/signatures)
 * @param {Object} doc - PDFDocument
 * @param {Object} event - VitalEvent document
 */
const renderOfficialSealAndSignature = async (doc, event) => {
  try {
    const basePath = path.join(__dirname, '..');
    
    // Draw divider
    doc.moveDown(1);
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Render all approvals from the event verification array
    await renderAllSignatureBlocks(doc, event.verification || [], basePath);
  } catch (err) {
    console.error('Error in renderOfficialSealAndSignature:', err.message);
  }
};

exports.generateBirthCertificate = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await VitalEvent.findById(eventId)
      .populate('citizen')
      .populate('registeredUser');

    if (!event || event.type !== 'birth') {
      return res.status(404).json({
        status: 'error',
        message: 'Birth event not found'
      });
    }

    if (event.status !== 'completed' && event.status !== 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'Birth event not yet fully approved'
      });
    }

    // Generate certificate number
    const certificateNumber = `BC-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create PDF certificate with professional styling
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    drawCertificateFrame(doc);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="birth-certificate-${certificateNumber}.pdf"`);
    doc.pipe(res);

    renderStandardHeader(doc, 'Official Birth Registration');

    doc.fontSize(10).font('Helvetica').text(`Digital ID / Cert No: ${certificateNumber}`, { align: 'right' });
    
    // Render QR Code if available
    if (event.certificate?.qrCode) {
      await renderQRCode(doc, event.certificate.qrCode, 485, 95, 50);
    } else {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${event._id}`;
      await renderQRCode(doc, qrUrl, 485, 95, 50);
    }

    doc.moveDown(1);

    // I. Registration Authority Details
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2d3748').text('I. REGISTRATION AUTHORITY', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text(`Registration Date: ${new Date(event.registrationDate).toLocaleDateString()}`);

    if (event.location) {
      const locText = `${event.location.kebele || 'N/A'} Kebele, ${event.location.woreda || 'N/A'} Woreda, ${event.location.zone || 'N/A'} Zone, ${event.location.region || 'N/A'} Region`;
      doc.text(`Place of Registration: ${locText}`);
      if (event.location.kebeleCode || event.location.woredaCode) {
        doc.fontSize(8).fillColor('#718096').text(`Location Codes: Kebele(${event.location.kebeleCode || 'N/A'}), Woreda(${event.location.woredaCode || 'N/A'})`);
      }
    }
    doc.fillColor('black').moveDown(1);

    // II. Child's Information (The Registrant)
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2d3748').text('II. CHILD INFORMATION (REGISTRANT)', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text(`Full Name: ${event.birthDetails.childName}`);
    doc.text(`Date of Birth: ${new Date(event.eventDate).toLocaleDateString()}`);
    doc.text(`Gender: ${event.birthDetails.gender}`);
    doc.text(`Place of Birth: ${event.birthDetails.placeOfBirth}`);
    doc.text(`Weight at Birth: ${event.birthDetails.weight || 'N/A'} kg`);

    // IDENTITY LINKAGE DISPLAY
    if (event.birthDetails.is_temporary_id) {
      const parentId = event.citizen?.personalInfo?.idNumber || 'N/A';
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#c53030')
        .text(`Identification Status: Parental Reference`);
      doc.fontSize(10).font('Helvetica').fillColor('black')
        .text(`Linked Parent National ID: ${parentId}`);
    } else {
      doc.text(`National ID: ${event.birthDetails.child_national_id || 'N/A'}`);
    }
    doc.moveDown(1);

    // III. Parent Information
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2d3748').text('III. PARENTAL INFORMATION', { underline: true });
    doc.moveDown(0.5);

    const parentY = doc.y;
    
    // Left Column: Father
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#2b6cb0').text('FATHER\'S INFORMATION', 50, parentY);
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text(`Name: ${event.birthDetails.fatherName || 'N/A'}`);
    doc.text(`Nationality: ${event.birthDetails.fatherNationality || 'Ethiopian'}`);
    doc.text(`Occupation: ${event.birthDetails.fatherOccupation || 'N/A'}`);
    doc.text(`Education: ${event.birthDetails.fatherEducation || 'N/A'}`);

    // Right Column: Mother
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#b83280').text('MOTHER\'S INFORMATION', 310, parentY);
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text(`Name: ${event.birthDetails.motherName || 'N/A'}`, 310);
    doc.text(`Nationality: ${event.birthDetails.motherNationality || 'Ethiopian'}`, 310);
    doc.text(`Occupation: ${event.birthDetails.motherOccupation || 'N/A'}`, 310);
    doc.text(`Education: ${event.birthDetails.motherEducation || 'N/A'}`, 310);

    doc.x = 50; // Reset X
    doc.moveDown(1.5);

    // IV. Authentication Section (Critical for User Request)
    await renderOfficialSealAndSignature(doc, event);

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#718096').text(
      'This document is computer generated and officially verified by the Vital Events Registration Agency of Ethiopia.',
      { align: 'center' }
    );

    doc.end();

    // Update event records
    event.certificate = { ...event.certificate, number: certificateNumber, issueDate: new Date() };
    await event.save();


  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Helper for death certificate rendering
const renderDeathInformation = (doc, event) => {
  doc.fontSize(12).font('Helvetica-Bold').text('DECEASED INFORMATION:', { underline: true });
  doc.moveDown(0.5);

  const deathInfo = [
    `Full Name: ${event.deathDetails?.deceasedName || 'N/A'}`,
    `Gender: ${event.deathDetails?.gender || 'N/A'}`,
    `Age at Death: ${event.deathDetails?.age || 'N/A'}`,
    `Date of Death: ${new Date(event.eventDate).toLocaleDateString()}`,
    `Place of Death: ${event.deathDetails?.placeOfDeath || 'N/A'}`,
    `Cause of Death: ${event.deathDetails?.causeOfDeath || 'N/A'}`
  ];

  deathInfo.forEach(info => {
    doc.fontSize(11).font('Helvetica').text(info);
  });

  doc.moveDown(1);

  doc.fontSize(11).font('Helvetica-Bold').text('INFORMANT DETAILS:');
  doc.fontSize(10).font('Helvetica').text(`  Name: ${event.deathDetails?.informantName || 'N/A'}`);
  doc.fontSize(10).font('Helvetica').text(`  Relationship: ${event.deathDetails?.informantRelationship || 'N/A'}`);
  doc.moveDown(1);
};

exports.downloadCertificate = async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('📄 Downloading certificate for event:', eventId);

    const event = await VitalEvent.findById(eventId)
      .populate('citizen')
      .populate('registeredUser');

    if (!event) {
      console.error('❌ Event not found:', eventId);
      return res.status(404).json({
        status: 'error',
        message: 'Event not found'
      });
    }

    console.log('✅ Event found:', event.type, 'Status:', event.status);
    console.log('📋 Verification data:', event.verification ? event.verification.length : 0, 'records');

    // --- PAYMENT VERIFICATION ---
    // Enforce payment for citizens
    if (req.user.role === 'citizen') {
      if (!event.certificate || event.certificate.paymentStatus !== 'paid') {
        console.log('⚠️ Payment required for citizen');
        return res.status(402).json({
          status: 'error',
          message: 'Payment Required: Please pay the certificate fee to download.',
          payment_required: true
        });
      }
    }

    if (!['completed', 'approved', 'pending_zone', 'pending_region', 'pending_national'].includes(event.status)) {
      console.log('⚠️ Event not yet fully approved for download:', event.status);
      return res.status(400).json({
        status: 'error',
        message: 'Certificate not yet available. Event must be completed or in monitoring transition.'
      });
    }

    const issuedByLabel = getIssuingLabel(event);
    const certificateNumber = event.certificate?.number || `${event.type.charAt(0).toUpperCase()}C-${Date.now().toString().slice(-8)}`;

    console.log('📋 Generating PDF certificate:', certificateNumber);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });

    drawCertificateFrame(doc);

    const typeLabel = event.type === 'birth' ? 'Official Birth' : event.type.toUpperCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${event.type}-certificate-${certificateNumber}.pdf"`);

    doc.pipe(res);

    renderStandardHeader(doc, `${typeLabel} Registration`);

    doc.fontSize(10).font('Helvetica').text(`Digital ID / Cert No: ${certificateNumber}`, { align: 'right' });
    
    // Render QR Code if available
    if (event.certificate?.qrCode) {
      await renderQRCode(doc, event.certificate.qrCode, 485, 95, 50);
    } else {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${event._id}`;
      await renderQRCode(doc, qrUrl, 485, 95, 50);
    }

    doc.moveDown(1);

    // Registration Info
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2d3748').text('I. REGISTRATION AUTHORITY', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('black').text(`Registration Date: ${new Date(event.registrationDate).toLocaleDateString()}`);

    // Complete location hierarchy
    const locationParts = [];
    if (event.location?.kebele) locationParts.push(`Kebele: ${event.location.kebele}`);
    if (event.location?.woreda) locationParts.push(`Woreda: ${event.location.woreda}`);
    if (event.location?.zone) locationParts.push(`Zone: ${event.location.zone}`);
    if (event.location?.region) locationParts.push(`Region: ${event.location.region}`);

    if (locationParts.length > 0) {
      doc.fontSize(10).font('Helvetica').text(`Location: ${locationParts.join(', ')}`);
    } else {
      doc.fontSize(10).font('Helvetica').text(`Location: ${event.location?.kebele || 'N/A'}, ${event.location?.woreda || 'N/A'}, ${event.location?.region || 'N/A'}`);
    }

    // Show location codes if available
    if (event.location?.kebeleCode || event.location?.woredaCode) {
      doc.fontSize(8).font('Helvetica').fillColor('#666666');
      const codes = [];
      if (event.location?.kebeleCode) codes.push(`Kebele Code: ${event.location.kebeleCode}`);
      if (event.location?.woredaCode) codes.push(`Woreda Code: ${event.location.woredaCode}`);
      if (codes.length > 0) {
        doc.text(`  (${codes.join(', ')})`);
      }
      doc.fillColor('black');
    }

    doc.moveDown(1.5);

    // Content Based on Type
    if (event.type === 'birth') {
      // Child Photo if available
      if (event.birthDetails?.childPhoto?.url) {
        try {
          const photoPath = path.join(__dirname, '..', event.birthDetails.childPhoto.url);
          if (fs.existsSync(photoPath)) {
            const photoBuffer = await getSafeImageBuffer(photoPath);
            if (photoBuffer && photoBuffer.length > 0) {
              doc.image(photoBuffer, 450, 160, { width: 100, height: 120 });
            }
          }
        } catch (e) { console.error('Error drawing child photo:', e.message); }
      }

      doc.fontSize(12).font('Helvetica-Bold').text('CHILD INFORMATION:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica').text(`Full Name: ${event.birthDetails?.childName || 'N/A'}`);
      doc.text(`Date of Birth: ${event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'N/A'}`);
      doc.text(`Gender: ${event.birthDetails?.gender || 'N/A'}`);
      doc.text(`Place of Birth: ${event.birthDetails?.placeOfBirth || 'N/A'}`);
      doc.text(`Hospital: ${event.birthDetails?.hospitalName || 'N/A'}`);
      doc.text(`Attending Doctor: ${event.birthDetails?.doctorName || 'N/A'}`);

      // IDENTITY LINKAGE DISPLAY
      if (event.birthDetails?.is_temporary_id) {
        const parentId = event.citizen?.personalInfo?.idNumber || 'N/A';
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#c53030')
          .text(`Identification Status: Parental Reference`);
        doc.fontSize(11).font('Helvetica').fillColor('black')
          .text(`Linked Parent National ID: ${parentId}`);
      } else {
        doc.text(`National ID: ${event.birthDetails?.child_national_id || 'N/A'}`);
      }

      doc.moveDown(1);

      doc.moveDown(1);

      // Section Header: Parent Information
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#2d3748').text('III. PARENTAL INFORMATION', { underline: true });
      doc.moveDown(0.5);

      const parentY = doc.y;
      
      // Left Column: Father
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#2b6cb0').text('FATHER\'S INFORMATION', 50, parentY);
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica').fillColor('black');
      doc.text(`Name: ${event.birthDetails?.fatherName || 'N/A'}`);
      doc.text(`Nationality: ${event.birthDetails?.fatherNationality || 'Ethiopian'}`);
      doc.text(`Occupation: ${event.birthDetails?.fatherOccupation || 'N/A'}`);
      doc.text(`Education: ${event.birthDetails?.fatherEducation || 'N/A'}`);

      // Right Column: Mother
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#b83280').text('MOTHER\'S INFORMATION', 310, parentY);
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica').fillColor('black');
      doc.text(`Name: ${event.birthDetails?.motherName || 'N/A'}`, 310);
      doc.text(`Nationality: ${event.birthDetails?.motherNationality || 'Ethiopian'}`, 310);
      doc.text(`Occupation: ${event.birthDetails?.motherOccupation || 'N/A'}`, 310);
      doc.text(`Education: ${event.birthDetails?.motherEducation || 'N/A'}`, 310);

      doc.x = 50; // Reset X
      doc.moveDown(1.5);
    }
    else if (event.type === 'marriage') {
      renderMarriageInformation(doc, event);
      renderSpouseInformation(doc, event);
      renderWitnessInformation(doc, event);
    }
    else if (event.type === 'death') {
      renderDeathInformation(doc, event);
    }

    doc.moveDown(2);

    // Official Signatures and Seals (Primary authentication)
    try {
      console.log('✍️ Rendering official signatures...');
      await renderOfficialSealAndSignature(doc, event);
      console.log('✅ Signatures rendered');
    } catch (signatureError) {
      console.error('❌ Error rendering signatures:', signatureError.message);
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('#999999')
        .text('Signature information temporarily unavailable.', { align: 'center' });
      doc.fillColor('black');
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica-Oblique').text(
      'This document is computer generated and officially verified by the Vital Events Registration System of Ethiopia.',
      { align: 'center' }
    );

    console.log('✅ Certificate PDF generation complete');
    doc.end();
  } catch (error) {
    console.error('❌ Download certificate error:', error.message);
    console.error('Error stack:', error.stack);

    // If headers not sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'An error occurred while generating your certificate PDF. Please try again or contact support.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } else {
      // Headers already sent, end the response
      res.end();
    }
  }
};

exports.generateResidentIDCard = async (req, res) => {
  try {
    const { citizenId } = req.params;

    const citizen = await User.findById(citizenId);

    if (!citizen) {
      return res.status(404).json({
        status: 'error',
        message: 'Citizen not found'
      });
    }

    // --- PAYMENT VERIFICATION ---
    // Allow admins/officers to view without payment, but enforce for citizens
    if (req.user.role === 'citizen') {
      if (!citizen.certificatePayment || citizen.certificatePayment.status !== 'paid') {
        return res.status(402).json({
          status: 'error',
          message: 'Payment Required: Please pay the certificate fee to download your Official Birth Certificate.',
          payment_required: true
        });
      }
    }

    // Determine ID Card Number (use National ID or generate one)
    const idCardNumber = citizen.personalInfo.idNumber || `ID-${Date.now().toString().slice(-8)}`;

    // For children, try to find their birth event to get the QR code
    let qrUrl = null;
    if (citizen.isChild) {
      const birthEvent = await VitalEvent.findOne({ registeredUser: citizen._id, type: 'birth' });
      if (birthEvent && birthEvent.certificate?.qrCode) {
        qrUrl = birthEvent.certificate.qrCode;
      } else if (birthEvent) {
        qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${birthEvent._id}`;
      }
    }

    // Create PDF with Frame
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50
    });
    drawCertificateFrame(doc);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="official-id-${idCardNumber}.pdf"`);
    doc.pipe(res);

    renderStandardHeader(doc, 'Official Birth Registration');

    doc.fontSize(10).font('Helvetica').text(`Digital ID: ${idCardNumber}`, { align: 'right' });
    
    // Render QR Code if available
    if (qrUrl) {
      await renderQRCode(doc, qrUrl, 485, 95, 50);
    }
    
    doc.moveDown(1);

    // Content Layout
    const cardContentY = doc.y;

    // I. PERSONAL INFORMATION
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2d3748').text('I. REGISTRANT PERSONAL DATA', { underline: true });
    doc.moveDown(0.3);

    // Photo Area fallback for child accounts
    let photoUrl = citizen.profilePhoto?.url;
    if (!photoUrl && citizen.isChild) {
      const birthEvent = await VitalEvent.findOne({ registeredUser: citizen._id, type: 'birth' });
      if (birthEvent && birthEvent.birthDetails?.childPhoto?.url) {
        photoUrl = birthEvent.birthDetails.childPhoto.url;
      }
    }

    if (photoUrl) {
      try {
        const photoPath = path.join(__dirname, '..', photoUrl);
        const photoBuffer = await getSafeImageBuffer(photoPath);
        if (photoBuffer && photoBuffer.length > 0) {
          doc.image(photoBuffer, 460, cardContentY, { width: 85, height: 100 });
        }
      } catch (e) { console.error('Error drawing photo:', e.message); }
    }

    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text(`FULL NAME: ${citizen.personalInfo.firstName} ${citizen.personalInfo.lastName}`);
    doc.text(`GENDER: ${citizen.personalInfo.gender || 'N/A'}`);
    doc.text(`DATE OF BIRTH: ${citizen.personalInfo.dateOfBirth ? new Date(citizen.personalInfo.dateOfBirth).toLocaleDateString() : 'N/A'}`);
    doc.text(`NATIONAL ID: ${idCardNumber}`);
    doc.text(`PHONE: ${citizen.personalInfo.phone || 'N/A'}`);
    doc.text(`EMAIL: ${citizen.personalInfo.email || 'N/A'}`);
    doc.moveDown(0.8);

    // II. LOCATION DATA
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#2d3748').text('II. GEOGRAPHIC RESIDENCY', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    doc.text(`KEBELE: ${citizen.location.kebeleName || citizen.location.kebele || 'N/A'}`);
    doc.text(`WOREDA: ${citizen.location.woredaName || citizen.location.woreda || 'N/A'}`);
    doc.text(`ZONE: ${citizen.location.zoneName || citizen.location.zone || 'N/A'}`);
    doc.text(`REGION: ${citizen.location.regionName || citizen.location.region || 'N/A'}`);
    doc.moveDown(1);

    // III. OFFICIAL VALIDATION (Stamps/Signatures)
    let citizenVerifications = [
      citizen.kebeleVerification ? { ...citizen.kebeleVerification.toObject(), level: 'kebele', status: 'approved', reviewedAt: citizen.kebeleVerification.approvedAt } : null,
      citizen.woredaVerification ? { ...citizen.woredaVerification.toObject(), level: 'woreda', status: 'approved', reviewedAt: citizen.woredaVerification.approvedAt } : null,
    ].filter(Boolean);

    // Fallback for child accounts - use verifications from the birth registration event
    if (citizenVerifications.length === 0 && citizen.isChild) {
      try {
        const birthEvent = await VitalEvent.findOne({ registeredUser: citizen._id, type: 'birth' });
        if (birthEvent && birthEvent.verification && birthEvent.verification.length > 0) {
          citizenVerifications = birthEvent.verification;
        }
      } catch (err) {
        console.error('Error fetching child birth event verifications:', err);
      }
    }

    await renderAllSignatureBlocks(doc, citizenVerifications, path.join(__dirname, '..'));

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#718096').text(
      'Property of the Federal Democratic Republic of Ethiopia. Officially issued by VERA.',
      { align: 'center' }
    );

    doc.end();


  } catch (error) {
    console.error('Generate ID Card error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// ==================== MARRIAGE CERTIFICATE GENERATION ====================

/**
 * Validates marriage certificate generation requirements
 * @param {Object} event - Marriage event data
 * @returns {Object} Validation result
 */
const validateMarriageCertificateRequest = (event) => {
  if (!event || event.type !== 'marriage') {
    return {
      isValid: false,
      status: 404,
      message: 'Marriage event not found'
    };
  }

  if (event.status !== 'completed') {
    return {
      isValid: false,
      status: 400,
      message: 'Marriage certificate can only be generated for completed events'
    };
  }

  return {
    isValid: true,
    status: 200,
    message: 'Certificate generation validated'
  };
};

/**
 * Sets up PDF document headers and basic structure
 * @param {Object} doc - PDFDocument instance
 * @param {string} eventId - Event ID for filename
 * @param {Object} res - Express response object
 * @returns {string} Generated filename
 */
const setupPDFDocument = (doc, eventId, res) => {
  const filename = `marriage-certificate-${eventId}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);
  return filename;
};

/**
 * Renders certificate header section
 * @param {Object} doc - PDFDocument instance
 */
const renderCertificateHeader = (doc) => {
  doc.fontSize(20).font('Helvetica-Bold').text('MARRIAGE CERTIFICATE', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Federal Democratic Republic of Ethiopia', { align: 'center' });
  doc.fontSize(10).font('Helvetica-Oblique').text('Vital Events Registration System', { align: 'center' });
  doc.moveDown(2);
};

/**
 * Renders certificate metadata with complete registrant information
 * @param {Object} doc - PDFDocument instance
 * @param {string} eventId - Event ID
 * @param {Object} event - Marriage event data
 */
const renderCertificateMetadata = (doc, eventId, event) => {
  doc.fontSize(11).font('Helvetica-Bold').text(`Certificate No: MARR-${eventId.slice(-8).toUpperCase()}`);
  doc.fontSize(11).font('Helvetica').text(`Date of Issue: ${new Date().toLocaleDateString()}`);
  doc.fontSize(11).font('Helvetica').text(`Marriage Date: ${new Date(event.eventDate).toLocaleDateString()}`);
  doc.moveDown(1.5);

  // Add complete registrant information
  if (event.citizen && event.citizen.personalInfo) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a').text('REGISTERED BY:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black').text(`Name: ${event.citizen.personalInfo.firstName} ${event.citizen.personalInfo.lastName}`);
    doc.fontSize(10).font('Helvetica').text(`National ID: ${event.citizen.personalInfo.idNumber || 'N/A'}`);
    doc.fontSize(10).font('Helvetica').text(`Phone: ${event.citizen.personalInfo.phone || 'N/A'}`);
    if (event.citizen.personalInfo.email) {
      doc.fontSize(10).font('Helvetica').text(`Email: ${event.citizen.personalInfo.email}`);
    }
    doc.moveDown(1);
  }

  // Add complete location information
  if (event.location) {
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a1a1a').text('REGISTRATION LOCATION:', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('black');
    if (event.location.kebele) doc.text(`Kebele: ${event.location.kebele}`);
    if (event.location.woreda) doc.text(`Woreda: ${event.location.woreda}`);
    if (event.location.zone) doc.text(`Zone: ${event.location.zone}`);
    if (event.location.region) doc.text(`Region: ${event.location.region}`);

    // Show location codes if available
    if (event.location.kebeleCode || event.location.woredaCode) {
      doc.fontSize(8).font('Helvetica').fillColor('#666666');
      const codes = [];
      if (event.location.kebeleCode) codes.push(`Kebele Code: ${event.location.kebeleCode}`);
      if (event.location.woredaCode) codes.push(`Woreda Code: ${event.location.woredaCode}`);
      if (codes.length > 0) {
        doc.text(`Codes: ${codes.join(', ')}`);
      }
      doc.fillColor('black');
    }
    doc.moveDown(1);
  }
};

/**
 * Renders marriage information section with complete location details
 * @param {Object} doc - PDFDocument instance
 * @param {Object} event - Marriage event data
 */
const renderMarriageInformation = (doc, event) => {
  doc.fontSize(12).font('Helvetica-Bold').text('MARRIAGE INFORMATION:', { underline: true });
  doc.moveDown(0.5);

  const marriageInfo = [
    `Date of Marriage: ${new Date(event.eventDate).toLocaleDateString()}`,
    `Marriage Type: ${event.marriageDetails?.marriageType || 'Civil'}`
  ];

  // Complete location hierarchy
  if (event.location) {
    const locationParts = [];
    if (event.location.kebele) locationParts.push(`${event.location.kebele} Kebele`);
    if (event.location.woreda) locationParts.push(`${event.location.woreda} Woreda`);
    if (event.location.zone) locationParts.push(`${event.location.zone} Zone`);
    if (event.location.region) locationParts.push(`${event.location.region} Region`);

    if (locationParts.length > 0) {
      marriageInfo.splice(1, 0, `Place of Marriage: ${locationParts.join(', ')}`);
    }
  }

  marriageInfo.forEach(info => {
    doc.fontSize(11).font('Helvetica').text(info);
  });

  doc.moveDown(1);
};

/**
 * Renders spouse information section
 * @param {Object} doc - PDFDocument instance
 * @param {Object} event - Marriage event data
 */
const renderSpouseInformation = (doc, event) => {
  // Husband Information
  doc.fontSize(11).font('Helvetica-Bold').text('HUSBAND:');
  const husbandInfo = [
    `Full Name: ${event.marriageDetails?.husbandName || 'N/A'}`,
    `National ID: ${event.marriageDetails?.husbandNationalId || 'N/A'}`,
    `Age: ${event.marriageDetails?.husbandAge || 'N/A'}`
  ];

  husbandInfo.forEach(info => {
    doc.fontSize(10).font('Helvetica').text(`  ${info}`);
  });

  doc.moveDown(0.5);

  // Wife Information
  doc.fontSize(11).font('Helvetica-Bold').text('WIFE:');
  const wifeInfo = [
    `Full Name: ${event.marriageDetails?.wifeName || 'N/A'}`,
    `National ID: ${event.marriageDetails?.wifeNationalId || 'N/A'}`,
    `Age: ${event.marriageDetails?.wifeAge || 'N/A'}`
  ];

  wifeInfo.forEach(info => {
    doc.fontSize(10).font('Helvetica').text(`  ${info}`);
  });

  doc.moveDown(1);
};

/**
 * Renders witness information section
 * @param {Object} doc - PDFDocument instance
 * @param {Object} event - Marriage event data
 */
const renderWitnessInformation = (doc, event) => {
  const witnessInfo = [
    `Witness 1: ${event.marriageDetails?.witness1 || 'N/A'}`,
    `Witness 2: ${event.marriageDetails?.witness2 || 'N/A'}`
  ];

  doc.fontSize(12).font('Helvetica-Bold').text('WITNESS INFORMATION:', { underline: true });
  doc.moveDown(0.5);

  witnessInfo.forEach(info => {
    doc.fontSize(11).font('Helvetica').text(info);
  });

  doc.moveDown(2);
};

/**
 * Renders approval chain section with complete information
 * @param {Object} doc - PDFDocument instance
 * @param {Object} event - Event data with verification array
 */
const renderApprovalChain = (doc, event) => {
  try {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a1a').text('APPROVAL CHAIN:', { underline: true });
    doc.moveDown(0.5);

    if (!event.verification || !Array.isArray(event.verification) || event.verification.length === 0) {
      doc.fontSize(9).font('Helvetica-Oblique').fillColor('#999999')
        .text('No approval records available.', 60, doc.y);
      doc.fillColor('black');
      doc.moveDown(1.5);
      return;
    }

    // Create a table-like structure for better readability
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#555555');
    const headerY = doc.y;
    doc.text('Level', 60, headerY, { width: 80 });
    doc.text('Officer Name', 140, headerY, { width: 120 });
    doc.text('Status', 260, headerY, { width: 80 });
    doc.text('Date', 340, headerY, { width: 100 });
    doc.moveDown(0.3);

    // Draw separator line
    doc.moveTo(50, doc.y).lineTo(450, doc.y).lineWidth(0.5).stroke('#cccccc').lineWidth(1);
    doc.moveDown(0.3);

    event.verification.forEach((ver, index) => {
      try {
        const yPos = doc.y;

        doc.fontSize(9).font('Helvetica').fillColor('#1a1a1a');
        doc.text((ver.level || 'Unknown').toUpperCase(), 60, yPos, { width: 80 });
        doc.text(ver.officerName || 'N/A', 140, yPos, { width: 120 });
        doc.text((ver.status || 'Approved').toUpperCase(), 260, yPos, { width: 80 });

        const approvalDate = ver.verifiedAt || ver.reviewedAt;
        doc.text(approvalDate ? new Date(approvalDate).toLocaleDateString() : 'N/A', 340, yPos, { width: 100 });

        doc.moveDown(0.5);

        // Add comments if available
        if (ver.comments) {
          doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666666');
          doc.text(`  Note: ${ver.comments}`, 60, doc.y, { width: 390 });
          doc.moveDown(0.3);
        }
      } catch (verError) {
        console.error('Error rendering verification entry:', verError);
        // Continue with next verification
      }
    });

    doc.fillColor('black');
  } catch (error) {
    console.error('Error in renderApprovalChain:', error);
    throw error;
  }

  doc.moveDown(1.5);
};

/**
 * Renders verification section
 * @param {Object} doc - PDFDocument instance
 * @param {Object} event - Marriage event data
 */
const renderVerificationSection = (doc, event) => {
  // No-op: handled by renderOfficialSealAndSignature above
  doc.moveDown(1);
};

// Generate Marriage Certificate
exports.generateMarriageCertificate = async (req, res) => {
  try {
    const { eventId } = req.params;

    // Fetch and validate event
    const event = await VitalEvent.findById(eventId)
      .populate('citizen')
      .populate('registeredUser');

    const validation = validateMarriageCertificateRequest(event);
    if (!validation.isValid) {
      return res.status(validation.status).json({
        status: 'error',
        message: validation.message
      });
    }

    // Setup PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    drawCertificateFrame(doc);
    const filename = setupPDFDocument(doc, eventId, res);

    doc.fontSize(10).font('Helvetica').text(`Digital ID / Cert No: MARR-${eventId.slice(-8).toUpperCase()}`, { align: 'right' });
    
    // Render QR Code if available
    if (event.certificate?.qrCode) {
      await renderQRCode(doc, event.certificate.qrCode, 485, 95, 50);
    } else {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${event._id}`;
      await renderQRCode(doc, qrUrl, 485, 95, 50);
    }

    doc.moveDown(1);

    // Render certificate sections
    renderStandardHeader(doc, 'Marriage Certificate');
    renderCertificateMetadata(doc, eventId, event);
    renderMarriageInformation(doc, event);
    renderSpouseInformation(doc, event);
    renderWitnessInformation(doc, event);

    // Official Authentication (Includes all level seals and signatures)
    await renderOfficialSealAndSignature(doc, event);


    // Footer
    doc.fontSize(8).font('Helvetica-Oblique').text('Property of Federal Democratic Republic of Ethiopia - Vital Events Registration System', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Generate Marriage Certificate error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};

// Generate Death Certificate (Woreda level)
exports.generateDeathCertificate = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await VitalEvent.findById(eventId)
      .populate('citizen')
      .populate('registeredUser');

    if (!event || event.type !== 'death') {
      return res.status(404).json({
        status: 'error',
        message: 'Death event not found'
      });
    }

    if (event.status !== 'completed' && event.status !== 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'Death event not yet fully approved'
      });
    }

    // Generate certificate number
    const certificateNumber = event.certificate?.number || `DC-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Setup PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    drawCertificateFrame(doc);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="death-certificate-${certificateNumber}.pdf"`);
    doc.pipe(res);

    renderStandardHeader(doc, 'Death Certificate');

    doc.fontSize(10).font('Helvetica').text(`Digital ID / Cert No: ${certificateNumber}`, { align: 'right' });
    
    // Render QR Code if available
    if (event.certificate?.qrCode) {
      await renderQRCode(doc, event.certificate.qrCode, 485, 95, 50);
    } else {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${event._id}`;
      await renderQRCode(doc, qrUrl, 485, 95, 50);
    }

    doc.moveDown(1);

    // Rendering Information
    renderDeathInformation(doc, event);

    // Official Signatures and Seals (Core authentication)
    await renderOfficialSealAndSignature(doc, event);

    doc.end();

    // Update event if needed
    if (!event.certificate?.number) {
      event.certificate = {
        ...event.certificate,
        number: certificateNumber,
        issueDate: new Date()
      };
      await event.save();
    }

  } catch (error) {
    console.error('Generate Death Certificate error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};
