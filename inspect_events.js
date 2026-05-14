const mongoose = require('mongoose');

async function inspectVitalEvents() {
    try {
        const uri = 'mongodb://localhost:27017/ethiopia-vital-events';
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const events = await db.collection('vitalevents').find({}).toArray();

        console.log(`Checking ${events.length} events...`);
        events.forEach(event => {
            console.log(`ID: ${event._id}, Type: ${event.type}, Status: ${event.status}`);
            console.log(`  CurrentLevel: ${event.currentLevel}`);
            console.log(`  RegisteredUser: ${event.registeredUser}`);
            console.log(`  ChildAccountInfo: ${JSON.stringify(event.childAccountInfo)}`);
            if (event.type === 'birth') {
                console.log(`  ChildName: ${event.birthDetails?.childName}`);
            }
            console.log('-------------------');
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

inspectVitalEvents();
