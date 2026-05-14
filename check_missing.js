const mongoose = require('mongoose');

async function checkMissingAccounts() {
    try {
        const uri = 'mongodb://localhost:27017/ethiopia-vital-events';
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        const birthEvents = await db.collection('vitalevents').find({ 
            type: 'birth', 
            status: { $in: ['approved', 'completed'] },
            registeredUser: { $exists: false }
        }).toArray();

        console.log(`Found ${birthEvents.length} approved/completed birth events MISSING registeredUser:`);
        for (let e of birthEvents) {
            console.log(`- Event ${e._id}: ChildName="${e.birthDetails?.childName}", Status=${e.status}`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkMissingAccounts();
