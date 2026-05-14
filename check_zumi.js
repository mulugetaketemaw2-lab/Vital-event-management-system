const mongoose = require('mongoose');

async function checkZumiHistory() {
    try {
        const uri = 'mongodb://localhost:27017/ethiopia-vital-events';
        await mongoose.connect(uri);
        const db = mongoose.connection.db;

        const zumi = await db.collection('vitalevents').findOne({ "birthDetails.childName": "zumi" });
        if (!zumi) {
            console.log('Zumi not found');
            return;
        }

        console.log(`Zumi Event ID: ${zumi._id}`);
        console.log(`Status: ${zumi.status}`);
        console.log(`CurrentLevel: ${zumi.currentLevel}`);
        console.log(`Verification History:`);
        zumi.verification.forEach(v => {
            console.log(`- Level: ${v.level}, Status: ${v.status}, VerifiedAt: ${v.verifiedAt}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkZumiHistory();
