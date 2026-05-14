const mongoose = require('mongoose');
const User = require('../models/User');
const VitalEvent = require('../models/VitalEvent');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find the child user
    const child = await User.findOne({ username: 'zumi' }).select('+password');
    if (!child) {
        console.log('❌ User "zumi" not found in database.');
        // List all citizen accounts to help diagnose
        const citizens = await User.find({ role: 'citizen' }).select('username personalInfo.firstName personalInfo.lastName status createdAt');
        console.log('\n📋 All citizen accounts:');
        citizens.forEach(c => {
            console.log(`  - username: "${c.username}"  name: "${c.personalInfo?.firstName} ${c.personalInfo?.lastName}"  status: ${c.status}  created: ${c.createdAt}`);
        });
        await mongoose.disconnect();
        return;
    }

    console.log(`\n👤 Found user: "${child.username}"  (${child.personalInfo?.firstName} ${child.personalInfo?.lastName})`);
    console.log(`   Status: ${child.status}  isActive: ${child.isActive}  isApproved: ${child.isApproved}`);
    console.log(`   Created: ${child.createdAt}`);

    // Find the vital event for this child
    const event = await VitalEvent.findOne({ registeredUser: child._id });
    if (event) {
        console.log(`\n📋 Associated VitalEvent: ${event._id}`);
        console.log(`   Certificate: ${event.certificate?.number}`);
        console.log(`   childAccountInfo: ${JSON.stringify(event.childAccountInfo)}`);
    }

    // Set a known password: "zumi1234" (or the certificate number if found)
    const newPassword = event?.certificate?.number || 'zumi1234';
    child.password = newPassword;
    child.isActive = true;
    child.isApproved = true;
    child.status = 'approved';
    await child.save();

    // Also update childAccountInfo on the event
    if (event) {
        event.childAccountInfo = {
            username: child.username,
            initialPassword: newPassword
        };
        await event.save();
        console.log(`\n✅ Updated event.childAccountInfo: username="${child.username}", initialPassword="${newPassword}"`);
    }

    console.log(`\n✅ Password has been reset successfully!`);
    console.log(`   USERNAME: ${child.username}`);
    console.log(`   PASSWORD: ${newPassword}`);
    console.log(`\nYou can now login with these credentials.`);

    await mongoose.disconnect();
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
