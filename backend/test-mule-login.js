const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testLogin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const username = 'mule';
        const password = '13118';

        const user = await User.findOne({ username });
        if (!user) {
            console.log(`❌ User "${username}" not found in database.`);
            return;
        }

        console.log(`👤 User found: ${user.username} (Role: ${user.role})`);
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            console.log('✅ Password MATCHES!');
        } else {
            console.log('❌ Password DOES NOT match.');
            // Let's also check if it's stored in plain text (unlikely but possible during development)
            if (user.password === password) {
                console.log('⚠️ Password matches in PLAIN TEXT (security risk!)');
            } else {
                console.log('Current hashed password in DB:', user.password);
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

testLogin();
