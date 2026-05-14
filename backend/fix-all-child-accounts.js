const mongoose = require('mongoose');
const User = require('./models/User');
const VitalEvent = require('./models/VitalEvent');

async function fixChildAccounts() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
        console.log('Connected to DB');

        // Find all events with a registeredUser
        const events = await VitalEvent.find({ registeredUser: { $exists: true, $ne: null } });
        console.log(`Found ${events.length} events with registered users.`);

        for (const event of events) {
            const userId = event.registeredUser;
            const user = await User.findById(userId);
            if (user) {
                console.log(`Processing User: ${user.username} (${user._id})`);
                user.isChild = true;

                // Also fix names if they have "Citizen" as lastName
                if (user.personalInfo && user.personalInfo.lastName === 'Citizen') {
                    // Try to get childName from event
                    const birthDetails = event.details && event.details.birth;
                    if (birthDetails && birthDetails.childName) {
                        const names = birthDetails.childName.split(' ');
                        if (names.length > 1) {
                            user.personalInfo.firstName = names[0];
                            user.personalInfo.lastName = names.slice(1).join(' ');
                            console.log(`  Updated Name to: ${user.personalInfo.firstName} ${user.personalInfo.lastName}`);
                        }
                    }
                }

                await user.save();
                console.log(`  Fixed isChild flag for ${user.username}`);
            }
        }

        // Specifically check 'zumi' just in case
        const zumi = await User.findOne({ username: 'zumi' });
        if (zumi && !zumi.isChild) {
            zumi.isChild = true;
            await zumi.save();
            console.log('Final check: Fixed zumi account isChild flag.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

fixChildAccounts();
