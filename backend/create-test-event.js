const mongoose = require('mongoose');
const VitalEvent = require('./models/VitalEvent');
const User = require('./models/User');

async function createTestEvent() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
    console.log('✅ Connected to MongoDB');

    // Find the citizen we just fixed
    const citizen = await User.findOne({role: 'citizen', status: 'pending_woreda'});
    
    if (!citizen) {
      console.log('❌ No citizen found');
      return;
    }

    // Create a test vital event that's been approved by kebele and forwarded to woreda
    const testEvent = new VitalEvent({
      type: 'birth',
      citizen: citizen._id,
      eventDate: new Date('2024-01-15'),
      location: citizen.location,
      status: 'pending',
      currentLevel: 'woreda', // This means it's been approved by kebele and is now at woreda level
      verification: [{
        level: 'kebele',
        representative: null, // Would be the kebele rep ID
        status: 'approved',
        comments: 'Approved by kebele representative',
        reviewedAt: new Date()
      }]
    });

    await testEvent.save();
    console.log('✅ Created test vital event for woreda review');
    console.log('Event ID:', testEvent._id);
    console.log('Type:', testEvent.type);
    console.log('Current Level:', testEvent.currentLevel);
    console.log('Status:', testEvent.status);
    console.log('Location:', testEvent.location.woredaName);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestEvent();
