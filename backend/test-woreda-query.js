const mongoose = require('mongoose');
const User = require('./models/User');

async function testWoredaQuery() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
    console.log('✅ Connected to MongoDB');

    // Simulate woreda user location (from logs)
    const woredaUser = {
      role: 'woreda',
      location: {
        region: 'Addis Ababa',
        zone: 'Addis Ketema',
        woreda: 'Woreda 01',
        kebele: ''
      }
    };

    console.log('🔍 Testing woreda query with user location:', woredaUser.location);

    // Test the exact query from getCitizensForWoredaReview
    const citizens = await User.find({
      role: 'citizen',
      $or: [
        { 'location.woreda': woredaUser.location.woreda },
        { 'location.woredaName': woredaUser.location.woreda }
      ],
      $or: [
        { status: 'pending_woreda' },
        { status: 'pending' }
      ]
    }).select('personalInfo location status verificationLevel createdAt verificationHistory familyMembers kebeleApprovalDate');

    console.log(`📊 Found ${citizens.length} citizens for woreda review in ${woredaUser.location.woreda}`);
    
    citizens.forEach(c => {
      console.log('\n--- Found Citizen ---');
      console.log('Name:', c.personalInfo?.firstName, c.personalInfo?.lastName);
      console.log('Status:', c.status);
      console.log('location.woreda:', c.location.woreda);
      console.log('location.woredaName:', c.location.woredaName);
      console.log('kebeleApprovalDate:', c.kebeleApprovalDate);
    });

    // Test vital events query
    const VitalEvent = require('./models/VitalEvent');
    const events = await VitalEvent.find({
      status: 'pending',
      currentLevel: 'woreda',
      'location.woreda': woredaUser.location.woreda
    });

    console.log(`\n📊 Found ${events.length} vital events for woreda review`);
    
    events.forEach(e => {
      console.log('\n--- Found Event ---');
      console.log('Type:', e.type);
      console.log('Status:', e.status);
      console.log('Current Level:', e.currentLevel);
      console.log('location.woreda:', e.location.woreda);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testWoredaQuery();
