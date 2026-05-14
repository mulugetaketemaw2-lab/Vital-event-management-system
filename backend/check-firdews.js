const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events').then(async () => {
    const user = await User.findOne({ username: 'firdews' });
    if (user) {
        console.log('User found:', {
            username: user.username,
            role: user.role,
            isActive: user.isActive,
            status: user.status,
            isApproved: user.isApproved
        });
    } else {
        console.log('User firdews NOT found');
        const neighbors = await User.find({ username: /fird/i }).limit(5);
        console.log('Possible similar usernames:', neighbors.map(u => u.username));
    }
    process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
