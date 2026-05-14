const mongoose = require('mongoose');
const User = require('./models/User');

async function fixCitizenStatus() {
  try {
    await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
    console.log('✅ Connected to MongoDB');

    // Find citizens with old 'verified' status and update them to 'pending_woreda'
    const result = await User.updateMany(
      { 
        role: 'citizen',
        status: 'verified',
        isApproved: true,
        isActive: true
      },
      { 
        $set: { 
          status: 'pending_woreda',
          isActive: false, // Not active until woreda approves
          kebeleApprovalDate: new Date() // Set kebele approval date
        }
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} citizens from 'verified' to 'pending_woreda'`);

    // Check the updated citizens
    const pendingWoreda = await User.find({
      role: 'citizen', 
      status: 'pending_woreda'
    });
    
    console.log(`📊 Now ${pendingWoreda.length} citizens are pending woreda review:`);
    
    pendingWoreda.forEach(c => {
      console.log('\n--- Pending Woreda ---');
      console.log('Name:', c.personalInfo?.firstName, c.personalInfo?.lastName);
      console.log('Status:', c.status);
      console.log('isApproved:', c.isApproved);
      console.log('isActive:', c.isActive);
      console.log('Woreda:', c.location?.woredaName);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixCitizenStatus();
