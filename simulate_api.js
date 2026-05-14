const mongoose = require('mongoose');

async function simulateApi() {
    try {
        const uri = 'mongodb://localhost:27017/ethiopia-vital-events';
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        // Find user firdews
        const user = await db.collection('users').findOne({ username: 'firdews' });
        if (!user) {
            console.log('User firdews not found');
            return;
        }

        console.log(`Simulating getMyEvents for user: ${user.username} (${user._id})`);

        // Simulate VitalEvent.find({ citizen: user._id }).populate(...)
        const events = await db.collection('vitalevents').find({ citizen: user._id }).toArray();

        console.log(`Found ${events.length} events for user`);
        for (let e of events) {
            console.log(`Event ${e._id}: type=${e.type}, status=${e.status}, registeredUser=${e.registeredUser}`);
            const hasRegisteredUser = !!e.registeredUser;
            console.log(`  Included in filtered credentials tab? ${hasRegisteredUser}`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

simulateApi();
