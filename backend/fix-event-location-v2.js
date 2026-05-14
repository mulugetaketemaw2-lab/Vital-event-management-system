const mongoose = require('mongoose');
const VitalEvent = require('./models/VitalEvent');
const User = require('./models/User');

async function fixEventLocation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
    console.log('✅ Connected to MongoDB');

    // Find the citizen to get their location
    const citizen = await User.findOne({role: 'citizen', status: 'pending_woreda'});
    
    if (!citizen) {
      console.log('❌ No citizen found');
      return;
    }

    console.log('📊 Found citizen with location:', citizen.location);

    // Create proper location object for vital event
    const eventLocation = {
      region: citizen.location.regionName,
      zone: citizen.location.zoneName,
      woreda: citizen.location.woredaName, // Use name for consistency with queries
      kebele: citizen.location.kebeleName,
      regionCode: citizen.location.region,
      zoneCode: citizen.location.zone,
      woredaCode: citizen.location.woreda,
      kebeleCode: citizen.location.kebeleCode
    };

    // Update the vital event with proper location
    const result = await VitalEvent.updateMany(
      { citizen: citizen._id },
      { 
        $set: { 
          location: eventLocation
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} vital events with proper location`);

    // Check the updated events
    const events = await VitalEvent.find({
      status: 'pending',
      currentLevel: 'woreda',
      'location.woreda': 'Woreda 01'
    });
    
    console.log(`📊 Now ${events.length} vital events are ready for woreda review:`);
    
    events.forEach(e => {
      console.log('\n--- Event ---');
      console.log('Type:', e.type);
      console.log('Status:', e.status);
      console.log('Current Level:', e.currentLevel);
      console.log('Location woreda:', e.location.woreda);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixEventLocation();
