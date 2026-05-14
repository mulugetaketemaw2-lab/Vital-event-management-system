const mongoose = require('mongoose');
const { convertLocationCodesToNames, convertLocationNamesToCodes, getRegex } = require('./backend/utils/locationHelper');
const VitalEvent = require('./backend/models/VitalEvent');
const User = require('./backend/models/User');

async function testQuery() {
    await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');

    // Simulate your user
    const user = await User.findOne({ username: 'kocha' });
    if (!user) {
        console.log('User not found');
        process.exit();
    }

    const roleToLevel = {
        'kebele_representative': 'kebele',
        'woreda_representative': 'woreda',
        'zone_representative': 'zone',
        'region_representative': 'region',
        'national': 'national',
        'kebele': 'kebele',
        'woreda': 'woreda',
        'zone': 'zone',
        'region': 'region'
    };

    const normalizedRole = roleToLevel[user.role] || user.role;
    const userLocNames = convertLocationCodesToNames(user.location);
    const userLocCodes = convertLocationNamesToCodes(user.location);

    let allEventsQuery = {
        $and: [
            { $or: [{ 'location.region': userLocNames.region }, { 'location.region': userLocNames.regionCode }, { 'location.region': userLocCodes.region }, { 'location.region': userLocCodes.regionCode }, { 'location.regionCode': userLocCodes.regionCode }, { 'location.region': getRegex(userLocNames.region) }] },
            { $or: [{ 'location.zone': userLocNames.zone }, { 'location.zone': userLocNames.zoneCode }, { 'location.zone': userLocCodes.zone }, { 'location.zone': userLocCodes.zoneCode }, { 'location.zoneCode': userLocCodes.zoneCode }, { 'location.zone': getRegex(userLocNames.zone) }] },
            { $or: [{ 'location.woreda': userLocNames.woreda }, { 'location.woreda': userLocNames.woredaCode }, { 'location.woreda': userLocCodes.woreda }, { 'location.woreda': userLocCodes.woredaCode }, { 'location.woredaCode': userLocCodes.woredaCode }, { 'location.woreda': getRegex(userLocNames.woreda) }] }
        ]
    };

    try {
        console.log('Query:', JSON.stringify(allEventsQuery, null, 2));
        const count = await VitalEvent.countDocuments(allEventsQuery);
        console.log('Found events:', count);
    } catch (err) {
        console.error('QUERY ERROR:', err);
    }

    process.exit();
}

testQuery();
