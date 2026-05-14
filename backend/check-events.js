const mongoose = require('mongoose');
const VitalEvent = require('./models/VitalEvent');
const User = require('./models/User');

async function checkEvents() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
    console.log('✅ Connected to MongoDB');

    // Check all vital events
    const events = await VitalEvent.find({});
    console.log(`📊 Total events: ${events.length}`);
    
    events.forEach(e => {
      console.log('\n--- Event ---');
      console.log('ID:', e._id);
      console.log('Type:', e.type);
      console.log('Status:', e.status);
      console.log('Current Level:', e.currentLevel);
      console.log('Location:', e.location);
    });

    // Check woreda representatives
    const woredaReps = await User.find({role: 'woreda_representative'});
    console.log(`\n📊 Woreda representatives: ${woredaReps.length}`);
    
    woredaReps.forEach(rep => {
      console.log('\n--- Woreda Rep ---');
      console.log('Name:', rep.personalInfo?.firstName, rep.personalInfo?.lastName);
      console.log('Username:', rep.username);
      console.log('Location:', rep.location);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkEvents();
