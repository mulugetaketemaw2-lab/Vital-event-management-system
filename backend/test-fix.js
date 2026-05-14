const mongoose = require('mongoose');

async function testFix() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
        console.log('Connected');
        const User = require('./models/User');
        const res = await User.updateOne({ username: 'zumi' }, { $set: { "location.woreda": "FIXED_NAME" } });
        console.log('Result:', res);
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
testFix();
