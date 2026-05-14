const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const VitalEvent = require('./models/VitalEvent');

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events');
        console.log('✅ Connected to MongoDB');

        const citizenCount = await User.countDocuments({ role: 'citizen' });
        const approvedCitizens = await User.countDocuments({ role: 'citizen', status: 'approved' });
        const pendingCitizens = await User.countDocuments({ role: 'citizen', status: 'pending' });
        const woredaPending = await User.countDocuments({ role: 'citizen', status: 'pending_woreda' });

        console.log('\n📊 CITIZEN STATS:');
        console.log('Total Citizens:', citizenCount);
        console.log('Approved:', approvedCitizens);
        console.log('Pending (Kebele):', pendingCitizens);
        console.log('Pending (Woreda):', woredaPending);

        const eventCount = await VitalEvent.countDocuments();
        const completedEvents = await VitalEvent.countDocuments({ status: 'completed' });
        const pendingEvents = await VitalEvent.countDocuments({ status: 'pending' });

        console.log('\n📊 EVENT STATS:');
        console.log('Total Events:', eventCount);
        console.log('Completed:', completedEvents);
        console.log('Pending:', pendingEvents);

        // Check one sample citizen's location
        const sample = await User.findOne({ role: 'citizen' });
        if (sample) {
            console.log('\n📍 Sample Citizen Location:');
            console.log(JSON.stringify(sample.location, null, 2));
            console.log('Status:', sample.status);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

checkData();
