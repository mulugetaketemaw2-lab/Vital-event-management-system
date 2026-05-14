const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to DB');
    const users = await User.find({}).limit(5);
    console.log('Sample Users:');
    users.forEach(u => {
        console.log(`- ${u.username} | Role: ${u.role} | isActive: ${u.isActive} | isBanned: ${u.identityLinkage?.is_banned}`);
    });
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
