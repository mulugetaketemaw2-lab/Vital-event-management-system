const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events';
console.log('Connecting to:', uri);

mongoose.connect(uri)
    .then(async () => {
        console.log('Connected!');
        const users = await User.find({ username: /fird/i });
        console.log('Users matching "fird":', users.length);
        users.forEach(u => {
            console.log(`- ${u.username} (${u.role}) status: ${u.status} active: ${u.isActive}`);
        });

        const firdews = await User.findOne({ username: 'firdews' });
        if (firdews) {
            console.log('Found firdews!');
        } else {
            console.log('firdews NOT found');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection error:', err);
        process.exit(1);
    });
