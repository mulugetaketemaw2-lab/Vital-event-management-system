const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function checkReps() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events');
        console.log('✅ Connected to MongoDB');

        const reps = await User.find({ role: { $in: ['region', 'national', 'zone', 'woreda', 'kebele'] } });

        console.log('\n👥 REPRESENTATIVE ACCOUNTS:');
        reps.forEach(r => {
            console.log(`\nUser: ${r.username} (${r.role})`);
            console.log('Location:', JSON.stringify(r.location, null, 2));
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

checkReps();
