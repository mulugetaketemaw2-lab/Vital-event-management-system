const mongoose = require('mongoose');
const User = require('./models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Find a Zone Representative
        const zoneRep = await User.findOne({ role: { $in: ['zone', 'zone_representative'] } });

        if (!zoneRep) {
            console.log('No Zone Representative found.');
        } else {
            console.log('--- Zone Representative ---');
            console.log(`ID: ${zoneRep._id}`);
            console.log(`Name: ${zoneRep.username}`);
            console.log('Location:', JSON.stringify(zoneRep.location, null, 2));

            // 2. Strict Query (Original - Expected to Fail)
            const strictQuery = {
                role: 'citizen',
                'location.region': zoneRep.location.region || zoneRep.location.regionName,
                'location.zone': zoneRep.location.zone || zoneRep.location.zoneName
            };
            console.log('\n--- Strict Query (Original) ---');
            console.log(JSON.stringify(strictQuery, null, 2));
            const strictCount = await User.countDocuments(strictQuery);
            console.log(`Matched Citizens: ${strictCount}`);

            // 3. Fixed Query (Proposed Fix)
            const regionVal = zoneRep.location.region || zoneRep.location.regionName;
            const zoneVal = zoneRep.location.zone || zoneRep.location.zoneName;

            const fixedQuery = {
                role: 'citizen',
                $and: [
                    {
                        $or: [
                            { 'location.region': regionVal },
                            { 'location.regionName': regionVal }
                        ]
                    },
                    {
                        $or: [
                            { 'location.zone': zoneVal },
                            { 'location.zoneName': zoneVal }
                        ]
                    }
                ]
            };

            console.log('\n--- Fixed Flexible Query ---');
            console.log(JSON.stringify(fixedQuery, null, 2));
            const fixedCount = await User.countDocuments(fixedQuery);
            console.log(`Matched Citizens with Fixed Query: ${fixedCount}`);

            if (fixedCount > 0) {
                console.log('✅ Fix verified: Citizens are now visible to the Zone Representative.');
            } else {
                console.log('❌ Fix failed: Still no citizens found. Check data further.');
            }

            // 4. Check Vital Events as well
            const VitalEvent = require('./models/VitalEvent');
            const eventQuery = {
                ...fixedQuery.locationQuery // Wait, fixedQuery structure in script is different. 
                // Let's just reconstruct it locally for the script or user the same structure
            };

            // Re-use the $and part from fixedQuery for events (removing role: citizen)
            const locationQuery = { $and: fixedQuery.$and };
            console.log('\n--- Vital Events Query ---');
            console.log(JSON.stringify(locationQuery, null, 2));
            const eventCount = await VitalEvent.countDocuments(locationQuery);
            console.log(`Matched Vital Events: ${eventCount}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
