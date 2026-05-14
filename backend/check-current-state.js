const mongoose = require('mongoose');
const User = require('./models/User');

async function checkCurrentState() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
    console.log('✅ Connected to MongoDB');

    // Check ALL citizens in the system
    const allCitizens = await User.find({ role: 'citizen' });
    console.log(`📊 Total citizens in system: ${allCitizens.length}`);

    allCitizens.forEach(c => {
      console.log('\n--- Citizen ---');
      console.log('Name:', c.personalInfo?.firstName, c.personalInfo?.lastName);
      console.log('Status:', c.status);
      console.log('isApproved:', c.isApproved);
      console.log('isActive:', c.isActive);
      console.log('Location:', {
        kebele: c.location?.kebeleName,
        woreda: c.location?.woredaName
      });
    });

    // Check citizens pending woreda review
    const pendingWoreda = await User.find({
      role: 'citizen',
      $or: [
        { status: 'pending_woreda' },
        { status: 'pending' }
      ]
    });

    console.log(`\n📊 Citizens pending woreda review: ${pendingWoreda.length}`);

    pendingWoreda.forEach(c => {
      console.log('\n--- Pending Woreda ---');
      console.log('Name:', c.personalInfo?.firstName, c.personalInfo?.lastName);
      console.log('Status:', c.status);
      console.log('Woreda:', c.location?.woredaName);
    });

    // Check citizens with 'verified' status (old system)
    const verifiedCitizens = await User.find({
      role: 'citizen',
      status: 'verified'
    });

    console.log(`\n📊 Citizens with old 'verified' status: ${verifiedCitizens.length}`);

    verifiedCitizens.forEach(c => {
      console.log('\n--- Verified (Old System) ---');
      console.log('Name:', c.personalInfo?.firstName, c.personalInfo?.lastName);
      console.log('Status:', c.status);
      console.log('isApproved:', c.isApproved);
      console.log('Woreda:', c.location?.woredaName);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkCurrentState();
