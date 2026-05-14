const mongoose = require('mongoose');
const User = require('./models/User');
const fs = require('fs');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events';

mongoose.connect(uri)
    .then(async () => {
        const user = await User.findOne({ username: 'firdews' });
        let result = '';
        if (user) {
            result += 'Found firdews!\n';
            user.password = 'password123';
            await user.save();
            result += 'Password reset to password123\n';
        } else {
            result += 'firdews NOT found\n';
            const similar = await User.find({ username: /^fird/i });
            result += 'Similar users: ' + similar.map(u => u.username).join(', ') + '\n';
        }
        fs.writeFileSync('result_log.txt', result, 'utf8');
        process.exit(0);
    })
    .catch(err => {
        fs.writeFileSync('result_log.txt', 'Error: ' + err.message, 'utf8');
        process.exit(1);
    });
