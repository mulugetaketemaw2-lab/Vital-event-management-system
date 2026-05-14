const mongoose = require('mongoose');

async function checkAllCredentials() {
    try {
        const uri = 'mongodb://localhost:27017/ethiopia-vital-events';
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        const events = await db.collection('vitalevents').find({ registeredUser: { $exists: true, $ne: null } }).toArray();

        console.log(`Found ${events.length} events with registeredUser:`);
        for (let e of events) {
            const parent = await db.collection('users').findOne({ _id: e.citizen });
            console.log(`- Event ${e._id}: Child=${e.birthDetails?.childName}, Parent=${parent?.username}, Status=${e.status}`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkAllCredentials();
