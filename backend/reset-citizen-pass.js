const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events').then(async () => {
    // Reset password for testing
    const user = await User.findOne({ username: 'sekina' });
    if (user) {
        user.password = 'test1234';
        await user.save();
        console.log('Password reset for sekina to test1234');
    } else {
        console.log('sekina not found');
    }
    process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
