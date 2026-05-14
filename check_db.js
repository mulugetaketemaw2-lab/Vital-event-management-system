const mongoose = require('mongoose');
const VitalEvent = require('./backend/models/VitalEvent');
const User = require('./backend/models/User');

async function checkEvents() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
        console.log('Connected to MongoDB');

        const birthEvents = await VitalEvent.find({ type: 'birth' });
        console.log(`Found ${birthEvents.length} birth events`);

        birthEvents.forEach(event => {
            console.log(`Event ID: ${event._id}, Status: ${event.status}, registeredUser: ${event.registeredUser}`);
            if (event.childAccountInfo) {
                console.log(`  childAccountInfo: ${JSON.stringify(event.childAccountInfo)}`);
            }
        });

        const childUsers = await User.find({ isChild: true });
        console.log(`Found ${childUsers.length} child users`);
        childUsers.forEach(u => {
            console.log(`  User: ${u.username}, CreatedBy: ${u.createdBy}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkEvents();
