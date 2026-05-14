const mongoose = require('mongoose');
const User = require('./models/User');
const VitalEvent = require('./models/VitalEvent');

async function fixZumiLocation() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
        console.log('Connected to DB');

        const user = await User.findOne({ username: 'zumi' });
        if (user) {
            console.log('Old Location:', user.location);
            user.location = {
                region: 'Amhara',
                regionCode: '3',
                zone: 'South Wollo',
                zoneCode: '3_4',
                woreda: 'Kombolcha',
                woredaCode: '3_4_1',
                kebele: 'Kombolcha01',
                kebeleCode: '3_4_1_1'
            };
            // Force mark as modified if it's a subdocument
            user.markModified('location');
            await user.save();
            console.log('New Location saved for zumi');
        }

        const events = await VitalEvent.find({ registeredUser: user?._id });
        for (const event of events) {
            event.location = {
                region: 'Amhara',
                regionCode: '3',
                zone: 'South Wollo',
                zoneCode: '3_4',
                woreda: 'Kombolcha',
                woredaCode: '3_4_1',
                kebele: 'Kombolcha01',
                kebeleCode: '3_4_1_1'
            };
            event.markModified('location');
            await event.save();
            console.log('Fixed location for event:', event._id);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

fixZumiLocation();
