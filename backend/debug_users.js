const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events');
        console.log("Connected to MongoDB");
        
        const users = await User.find({}, 'username role status isActive isApproved').limit(20);
        console.log("Recent Users:");
        console.table(users.map(u => ({
            username: u.username,
            role: u.role,
            status: u.status,
            isActive: u.isActive,
            isApproved: u.isApproved
        })));
        
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkUsers();
