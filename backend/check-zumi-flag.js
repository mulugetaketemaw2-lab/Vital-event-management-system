const mongoose = require('mongoose');
const User = require('./models/User');

async function checkZumi() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
        const user = await User.findOne({ username: 'zumi' });
        if (user) {
            console.log('User Found:');
            console.log('Username:', user.username);
            console.log('isChild:', user.isChild);
            console.log('Role:', user.role);
            console.log('Status:', user.status);

            if (user.isChild !== true) {
                console.log('UPDATING: Setting isChild to true...');
                user.isChild = true;
                await user.save();
                console.log('Update Successful.');
            }
        } else {
            console.log('User "zumi" not found.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

checkZumi();
