const mongoose = require('mongoose');

async function checkIds() {
    try {
        const uri = 'mongodb://localhost:27017/ethiopia-vital-events';
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        const event = await db.collection('vitalevents').findOne({ "birthDetails.childName": "zumi" });
        console.log(`Event ID: ${event._id}`);
        console.log(`Event.registeredUser: ${event.registeredUser} (Type: ${typeof event.registeredUser})`);

        const user = await db.collection('users').findOne({ username: 'zumi' });
        console.log(`User ID: ${user._id} (Type: ${typeof user._id})`);

        const match = event.registeredUser.toString() === user._id.toString();
        console.log(`IDs match? ${match}`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkIds();
