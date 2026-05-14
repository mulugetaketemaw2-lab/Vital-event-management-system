const mongoose = require('mongoose');
require('dotenv').config();

// Test the fixed regional controller logic
async function testFixedRegional() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Simulate the regional controller query
    const jurisdictionQuery = {
      role: 'citizen'
    };

    console.log('🔍 Testing Fixed Regional Query:');
    console.log('Query:', JSON.stringify(jurisdictionQuery, null, 2));

    const allCitizens = await mongoose.connection.db.collection('users').find({
      ...jurisdictionQuery,
      status: { 
        $in: ['approved', 'rejected', 'rejected_woreda', 'verified'] // Only approved and rejected
      }
    }).toArray();

    console.log('📊 Approved/Rejected Citizens found:', allCitizens.length);

    // Group citizens by status
    const citizensByStatus = {
      approved: allCitizens.filter(c => c.status === 'approved'),
      rejected_woreda: allCitizens.filter(c => c.status === 'rejected_woreda'),
      rejected: allCitizens.filter(c => c.status === 'rejected'),
      verified: allCitizens.filter(c => c.status === 'verified')
    };

    console.log('\n📈 Citizens by Status:');
    console.log('✅ Approved:', citizensByStatus.approved.length);
    console.log('❌ Rejected:', citizensByStatus.rejected.length);
    console.log('🚫 Rejected Woreda:', citizensByStatus.rejected_woreda.length);
    console.log('✅ Verified:', citizensByStatus.verified.length);

    // Show approved citizens
    console.log('\n✅ Approved Citizens:');
    citizensByStatus.approved.forEach((citizen, index) => {
      console.log(`${index + 1}. ${citizen.personalInfo?.firstName} ${citizen.personalInfo?.lastName} - ${citizen.location?.woreda} → ${citizen.location?.kebele}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testFixedRegional();
