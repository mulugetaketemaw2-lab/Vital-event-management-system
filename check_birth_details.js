const mongoose = require('mongoose');

async function checkSpecificEvents() {
    try {
        const uri = 'mongodb://localhost:27017/ethiopia-vital-events';
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        const events = await db.collection('vitalevents').find({ 
            type: 'birth', 
            status: { $in: ['approved', 'completed'] } 
        }).toArray();

        console.log(`Found ${events.length} approved/completed birth events:`);
        for (let event of events) {
            console.log(`Event ID: ${event._id}`);
            console.log(`  Child Name: ${event.birthDetails?.childName}`);
            console.log(`  Status: ${event.status}`);
            console.log(`  RegisteredUser (Field): ${event.registeredUser}`);
            console.log(`  ChildAccountInfo: ${JSON.stringify(event.childAccountInfo)}`);
            
            if (event.citizen) {
                const parent = await db.collection('users').findOne({ _id: event.citizen });
                console.log(`  Parent (Registrar): ${parent?.username} (${parent?._id})`);
            }
            
            if (event.registeredUser) {
                const child = await db.collection('users').findOne({ _id: event.registeredUser });
                console.log(`  Child Account Exists: ${child ? 'Yes' : 'No'} (User: ${child?.username})`);
            }
            console.log('---');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkSpecificEvents();
