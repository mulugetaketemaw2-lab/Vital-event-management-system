const { MongoClient, ObjectId } = require('mongodb');

async function fixCredentialsRaw() {
    const uri = 'mongodb://localhost:27017/ethiopia-vital-events';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db();

        // Find approved/completed birth events missing registeredUser or childAccountInfo
        const events = await db.collection('vitalevents').find({
            type: 'birth',
            status: { $in: ['approved', 'completed'] },
            $or: [
                { registeredUser: { $exists: false } },
                { registeredUser: null },
                { childAccountInfo: { $exists: false } }
            ]
        }).toArray();

        console.log(`Found ${events.length} events to fix.`);

        for (let event of events) {
            console.log(`Fixing Event ${event._id} (${event.birthDetails?.childName})...`);

            const birthDetails = event.birthDetails || {};
            const childName = birthDetails.childName || 'Child';
            
            // Generate username: lowercase name, no spaces
            let baseUsername = childName.toLowerCase().replace(/\s+/g, '') || 'child';
            let username = baseUsername;
            let counter = 1;

            // Ensure unique username
            while (await db.collection('users').findOne({ username })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            const certNumber = (event.certificate && event.certificate.number) || `CERT-B${Date.now().toString().slice(-6)}`;

            // Improved name parsing
            const nameParts = childName.trim().split(/\s+/);
            const firstName = nameParts[0] || 'Child';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Citizen';

            // Find parent
            const parentUser = await db.collection('users').findOne({ _id: event.citizen });
            const parentNationalId = (parentUser && parentUser.personalInfo && parentUser.personalInfo.idNumber) || '';

            // Create account
            try {
                const childId = new ObjectId();
                await db.collection('users').insertOne({
                    _id: childId,
                    username: username,
                    password: certNumber, // In a real app this should be hashed
                    role: 'citizen',
                    personalInfo: {
                        firstName: firstName,
                        lastName: lastName,
                        dateOfBirth: event.eventDate,
                        gender: birthDetails.gender || 'male',
                        idNumber: birthDetails.child_national_id || certNumber
                    },
                    location: event.location,
                    isActive: true,
                    isApproved: true,
                    status: 'approved',
                    isChild: true,
                    createdBy: event.citizen,
                    identityLinkage: {
                        is_temporary_id: true,
                        id_type: "Parental Reference",
                        reference_id: parentNationalId
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                });

                await db.collection('vitalevents').updateOne(
                    { _id: event._id },
                    { 
                        $set: { 
                            registeredUser: childId,
                            childAccountInfo: {
                                username: username,
                                initialPassword: certNumber
                            }
                        } 
                    }
                );
                
                console.log(`  ✅ Fixed: Created account ${username}`);
            } catch (err) {
                console.error(`  ❌ Failed to create account for ${username}:`, err.message);
            }
        }

    } finally {
        await client.close();
        console.log('Connection closed.');
    }
}

fixCredentialsRaw().catch(console.error);
