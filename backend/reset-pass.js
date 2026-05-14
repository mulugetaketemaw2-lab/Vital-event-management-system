const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    const user = await User.findOne({ username: 'national.rep' });
    if (user) {
        user.password = 'password123';
        await user.save();
        console.log('Password reset successfully for national.rep');
    } else {
        console.log('User national.rep not found');
    }
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
