const mongoose = require('mongoose');

async function simulateApi() {
    try {
        const uri = 'mongodb://localhost:27017/ethiopia-vital-events';
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        const user = await db.collection('users').findOne({ username: 'firdews' });
        const events = await db.collection('vitalevents').find({ citizen: user._id }).toArray();

        const filtered = events.filter(e => !!e.registeredUser);
        console.log(`User: firdews has ${events.length} total events`);
        console.log(`Filtered (with registeredUser): ${filtered.length} events`);

        filtered.forEach(e => {
            console.log(`- ${e.birthDetails?.childName || 'Unknown'}: status=${e.status}, regUser=${e.registeredUser}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

simulateApi();
