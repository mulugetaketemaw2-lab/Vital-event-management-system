const mongoose = require('mongoose');
require('dotenv').config();

// Test regional representative location data
async function testRegionalLocation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find regional representative
    const regionalRep = await mongoose.connection.db.collection('users').findOne({
      role: { $in: ['region', 'region_representative'] }
    });

    if (regionalRep) {
      console.log('🏛️ Regional Representative Found:');
      console.log('Name:', regionalRep.personalInfo?.firstName, regionalRep.personalInfo?.lastName);
      console.log('Role:', regionalRep.role);
      console.log('Location:', JSON.stringify(regionalRep.location, null, 2));
    } else {
      console.log('❌ No regional representative found');
    }

    // Test the query that regional controller uses
    const jurisdictionQuery = {
      role: 'citizen',
      $or: [
        { 'location.region': regionalRep?.location?.region },
        { 'location.regionName': regionalRep?.location?.regionName }
      ]
    };

    console.log('\n🔍 Testing Regional Query:');
    console.log('Query:', JSON.stringify(jurisdictionQuery, null, 2));

    const citizens = await mongoose.connection.db.collection('users').find(jurisdictionQuery).toArray();
    console.log('📊 Citizens found with regional query:', citizens.length);

    // Show citizen locations
    citizens.forEach((citizen, index) => {
      console.log(`\n--- Citizen ${index + 1} ---`);
      console.log('Name:', citizen.personalInfo?.firstName, citizen.personalInfo?.lastName);
      console.log('Status:', citizen.status);
      console.log('Location:', JSON.stringify(citizen.location, null, 2));
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testRegionalLocation();
