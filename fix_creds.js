const mongoose = require('mongoose');
const VitalEvent = require('./backend/models/VitalEvent');
const User = require('./backend/models/User');

async function fixCredentials() {
    try {
        await mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events');
        console.log('Connected to MongoDB');

        // Find approved/completed birth events missing registeredUser or childAccountInfo
        const events = await VitalEvent.find({
            type: 'birth',
            status: { $in: ['approved', 'completed'] },
            $or: [
                { registeredUser: { $exists: false } },
                { registeredUser: null },
                { childAccountInfo: { $exists: false } }
            ]
        });

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
            while (await User.findOne({ username })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            const certNumber = event.certificate?.number || `CERT-B${Date.now().toString().slice(-6)}`;

            // Improved name parsing
            const nameParts = childName.trim().split(/\s+/);
            const firstName = nameParts[0] || 'Child';
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Citizen';

            // Find parent
            const parentUser = await User.findById(event.citizen);
            const parentNationalId = parentUser?.personalInfo?.idNumber || '';

            // Create account
            try {
                const childAccount = await User.create({
                    username: username,
                    password: certNumber,
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
                    }
                });

                event.registeredUser = childAccount._id;
                event.childAccountInfo = {
                    username: username,
                    initialPassword: certNumber
                };
                
                await event.save();
                console.log(`  ✅ Fixed: Created account ${username}`);
            } catch (err) {
                console.error(`  ❌ Failed to create account for ${username}:`, err.message);
                
                // If account creation fails (e.g. ID duplicate), still try to set childAccountInfo if we can find it?
                // Or just skip.
            }
        }

        await mongoose.disconnect();
        console.log('Done.');
    } catch (err) {
        console.error(err);
    }
}

fixCredentials();
