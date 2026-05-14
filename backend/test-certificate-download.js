require('dotenv').config();
const mongoose = require('mongoose');
const VitalEvent = require('./models/VitalEvent');

async function testCertificateDownload() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the event ID from command line or use a default
    const eventId = process.argv[2] || '69a355ec4d8749df6b1c51a8';
    
    console.log(`\n📄 Testing certificate download for event: ${eventId}`);
    console.log('─'.repeat(60));

    const event = await VitalEvent.findById(eventId)
      .populate('citizen')
      .populate('verification.representative');

    if (!event) {
      console.error('❌ Event not found!');
      process.exit(1);
    }

    console.log('\n✅ Event found!');
    console.log('─'.repeat(60));
    console.log('Event Type:', event.type);
    console.log('Event Status:', event.status);
    console.log('Registration Date:', event.registrationDate);
    console.log('Event Date:', event.eventDate);

    console.log('\n📍 Location Information:');
    console.log('─'.repeat(60));
    if (event.location) {
      console.log('Kebele:', event.location.kebele || 'N/A');
      console.log('Kebele Code:', event.location.kebeleCode || 'N/A');
      console.log('Woreda:', event.location.woreda || 'N/A');
      console.log('Woreda Code:', event.location.woredaCode || 'N/A');
      console.log('Zone:', event.location.zone || 'N/A');
      console.log('Region:', event.location.region || 'N/A');
    } else {
      console.log('⚠️ No location data');
    }

    console.log('\n👤 Citizen Information:');
    console.log('─'.repeat(60));
    if (event.citizen) {
      console.log('Citizen ID:', event.citizen._id);
      console.log('Name:', event.citizen.personalInfo?.firstName, event.citizen.personalInfo?.lastName);
      console.log('Email:', event.citizen.email);
    } else {
      console.log('⚠️ No citizen data (not populated)');
    }

    console.log('\n✅ Verification/Approval Chain:');
    console.log('─'.repeat(60));
    if (event.verification && event.verification.length > 0) {
      event.verification.forEach((ver, index) => {
        console.log(`\n${index + 1}. ${ver.level?.toUpperCase() || 'Unknown'} Level:`);
        console.log('   Status:', ver.status || 'N/A');
        console.log('   Officer:', ver.officerName || 'N/A');
        console.log('   Date:', ver.verifiedAt || ver.reviewedAt || 'N/A');
        console.log('   Has Seal:', ver.seal?.url ? 'Yes' : 'No');
        console.log('   Has Signature:', ver.signature?.url ? 'Yes' : 'No');
        if (ver.comments) {
          console.log('   Comments:', ver.comments);
        }
      });
    } else {
      console.log('⚠️ No verification records');
    }

    console.log('\n📋 Certificate Information:');
    console.log('─'.repeat(60));
    if (event.certificate) {
      console.log('Certificate Number:', event.certificate.number || 'Not generated');
      console.log('Issue Date:', event.certificate.issueDate || 'N/A');
      console.log('Payment Status:', event.certificate.paymentStatus || 'unpaid');
    } else {
      console.log('⚠️ No certificate data');
    }

    if (event.type === 'birth' && event.birthDetails) {
      console.log('\n👶 Birth Details:');
      console.log('─'.repeat(60));
      console.log('Child Name:', event.birthDetails.childName || 'N/A');
      console.log('Gender:', event.birthDetails.gender || 'N/A');
      console.log('Father Name:', event.birthDetails.fatherName || 'N/A');
      console.log('Mother Name:', event.birthDetails.motherName || 'N/A');
      console.log('Place of Birth:', event.birthDetails.placeOfBirth || 'N/A');
      console.log('Hospital:', event.birthDetails.hospitalName || 'N/A');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Data Check Complete!');
    console.log('═'.repeat(60));

    // Check for potential issues
    console.log('\n🔍 Potential Issues:');
    console.log('─'.repeat(60));
    
    const issues = [];
    
    if (!event.location) issues.push('❌ Missing location data');
    if (!event.citizen) issues.push('❌ Citizen not populated');
    if (!event.verification || event.verification.length === 0) issues.push('⚠️ No verification records');
    if (event.status !== 'completed' && event.status !== 'approved') issues.push(`⚠️ Event status is '${event.status}' (should be 'completed' or 'approved')`);
    if (!event.birthDetails && event.type === 'birth') issues.push('❌ Missing birth details');
    
    if (issues.length === 0) {
      console.log('✅ No issues found! Certificate should generate successfully.');
    } else {
      issues.forEach(issue => console.log(issue));
    }

    console.log('\n');
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testCertificateDownload();
