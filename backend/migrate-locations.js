const mongoose = require('mongoose');
const User = require('./models/User');
const VitalEvent = require('./models/VitalEvent');
const { locationMapping } = require('./utils/locationHelper');

async function fixAllLocations() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
        console.log('Connected to DB');

        const convert = (loc) => {
            if (!loc) return loc;
            const updated = { ...loc };

            if (updated.region && locationMapping.regions[updated.region]) {
                updated.regionCode = updated.region;
                updated.region = locationMapping.regions[updated.region];
            }
            if (updated.zone && locationMapping.zones[updated.zone]) {
                updated.zoneCode = updated.zone;
                updated.zone = locationMapping.zones[updated.zone];
            }
            if (updated.woreda && locationMapping.woredas[updated.woreda]) {
                updated.woredaCode = updated.woreda;
                updated.woreda = locationMapping.woredas[updated.woreda];
            }
            if (updated.kebele && locationMapping.kebeles[updated.kebele]) {
                updated.kebeleCode = updated.kebele;
                updated.kebele = locationMapping.kebeles[updated.kebele];
            }
            return updated;
        };

        // Fix Users
        const users = await User.find({});
        console.log(`Checking ${users.length} users...`);
        for (const user of users) {
            if (user.location) {
                const newLoc = convert(user.location);
                if (newLoc.woreda !== user.location.woreda || newLoc.kebele !== user.location.kebele) {
                    user.location = newLoc;
                    await user.save();
                    console.log(`Fixed location for user: ${user.username}`);
                }
            }
            // Also fix personalInfo.currentAddress if it exists
            if (user.personalInfo && user.personalInfo.currentAddress) {
                const newAddr = convert(user.personalInfo.currentAddress);
                if (newAddr.woreda !== user.personalInfo.currentAddress.woreda) {
                    user.personalInfo.currentAddress = newAddr;
                    await user.save();
                    console.log(`Fixed address for user: ${user.username}`);
                }
            }
        }

        // Fix Vital Events
        const events = await VitalEvent.find({});
        console.log(`Checking ${events.length} events...`);
        for (const event of events) {
            if (event.location) {
                const newLoc = convert(event.location);
                if (newLoc.woreda !== event.location.woreda || newLoc.kebele !== event.location.kebele) {
                    event.location = newLoc;
                    await event.save();
                    console.log(`Fixed location for event: ${event._id}`);
                }
            }
        }

        console.log('Migration completed successfully.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

fixAllLocations();
