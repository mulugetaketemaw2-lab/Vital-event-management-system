const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events';

mongoose.connect(uri)
    .then(async () => {
        const user = await User.findOne({ username: 'firdews' });
        if (user) {
            console.log('User firdews found!');
            user.password = 'password123';
            await user.save();
            console.log('Password reset to password123');
        } else {
            console.log('User firdews NOT found');
            // Search for something starting with fird
            const similar = await User.find({ username: /^fird/i });
            console.log('Similar users:', similar.map(u => u.username));
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
