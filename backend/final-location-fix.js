const mongoose = require('mongoose');
const User = require('./models/User');
const VitalEvent = require('./models/VitalEvent');
const { locationMapping, convertLocationCodesToNames } = require('./utils/locationHelper');

async function migrate() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
        console.log('Connected to DB');

        const users = await User.find({});
        for (const user of users) {
            if (user.location) {
                const newLoc = convertLocationCodesToNames(user.toObject().location);
                await User.updateOne({ _id: user._id }, { $set: { location: newLoc } });
            }
        }
        console.log(`Updated ${users.length} users`);

        const events = await VitalEvent.find({});
        for (const event of events) {
            if (event.location) {
                const newLoc = convertLocationCodesToNames(event.toObject().location);
                await VitalEvent.updateOne({ _id: event._id }, { $set: { location: newLoc } });
            }
        }
        console.log(`Updated ${events.length} events`);

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}
migrate();
