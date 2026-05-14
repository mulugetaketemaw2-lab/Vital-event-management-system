const mongoose = require('mongoose');

async function checkRaw() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
        const db = mongoose.connection.db;
        const user = await db.collection('users').findOne({ username: 'zumi' });
        console.log('Raw User Location:', JSON.stringify(user.location, null, 2));
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
checkRaw();
