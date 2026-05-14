const User = require('../models/User');
const VitalEvent = require('../models/VitalEvent');
const Notification = require('../models/Notification');

/**
 * Service to handle Temporary Identity Linkage maturity logic.
 * Tracks age, sends notifications, and enforces account termination/data deletion.
 */

const identityLinkageService = {
    /**
     * Main worker function to be called periodically (e.g., daily)
     */
    processIdentityMaturity: async () => {
        console.log('🔄 Starting Identity Maturity Check...');

        const now = new Date();
        const fiveYearsInMs = 5 * 365.25 * 24 * 60 * 60 * 1000;
        const sixYearsInMs = 6 * 365.25 * 24 * 60 * 60 * 1000;

        // Find all users with temporary IDs
        const users = await User.find({
            'identityLinkage.is_temporary_id': true,
            'role': 'citizen',
            'identityLinkage.is_banned': { $ne: true }
        });

        console.log(`🔍 Found ${users.length} users with temporary IDs.`);

        for (const user of users) {
            try {
                const cycleCount = user.identityLinkage.notification_cycle_count || 0;
                const lastNotif = user.identityLinkage.last_notification_date;
                const registrationAgeInMs = now - user.createdAt;
                
                if (registrationAgeInMs >= sixYearsInMs || cycleCount >= 12) {
                    await identityLinkageService.enforceHardStop(user);
                    continue;
                }

                // CHECK MATURITY THRESHOLD (5 Years)
                if (registrationAgeInMs >= fiveYearsInMs) {
                    // Check if it's time for the next notification (every 30 days)
                    const daysSinceLastNotif = lastNotif ? (now - lastNotif) / (1000 * 60 * 60 * 24) : 999;

                    if (daysSinceLastNotif >= 30) {
                        await identityLinkageService.sendMaturityNotification(user);
                    }
                }
            } catch (err) {
                console.error(`❌ Error processing maturity for user ${user._id}:`, err);
            }
        }

        console.log('✅ Identity Maturity Check Completed.');
    },

    /**
     * Sends 30-day interval notifications to Parent and Child
     */
    sendMaturityNotification: async (user) => {
        console.log(`📣 Sending maturity notification to user ${user.username} (Cycle: ${user.identityLinkage.notification_cycle_count + 1})`);

        const message = "Action Required: The registered child has reached identity maturity. Please update the profile with a unique National ID to avoid service restrictions and impending account termination.";

        // 1. Notify Child
        await Notification.create({
            type: 'system',
            recipient: user._id,
            message,
            data: { type: 'identity_maturity_warning' }
        });

        // 2. Notify Parent (if linked)
        if (user.createdBy) {
            await Notification.create({
                type: 'system',
                recipient: user.createdBy,
                message: `Action Required for your child (${user.personalInfo.firstName} ${user.personalInfo.lastName}): They have reached identity maturity. Please update their profile with a unique National ID to avoid service restrictions.`,
                data: {
                    childId: user._id,
                    type: 'child_identity_maturity_warning'
                }
            });
        }

        // Update user record
        user.identityLinkage.notification_cycle_count += 1;
        user.identityLinkage.last_notification_date = new Date();
        await user.save();
    },

    /**
     * Bans the account and permanently deletes all associated data
     */
    enforceHardStop: async (user) => {
        console.log(`🚫 HARD STOP: Banning and Deleting data for user ${user.username} due to identity maturity non-compliance.`);

        const userId = user._id;

        // 1. Ban the account first (to prevent further actions)
        user.identityLinkage.is_banned = true;
        user.isActive = false;
        await user.save();

        // 2. Permanent Deletion of Associated Data
        // Find all vital events where this user is the registrant
        await VitalEvent.deleteMany({ citizen: userId });

        // Find all vital events where this user is the "subject" (e.g. child in birth event)
        await VitalEvent.deleteMany({ registeredUser: userId });

        // Delete notifications
        await Notification.deleteMany({ recipient: userId });
        await Notification.deleteMany({ sender: userId });

        // 3. Delete the User record itself
        await User.findByIdAndDelete(userId);

        console.log(`🗑️ Permanently deleted all data for user ${userId}.`);
    },

    checkServiceAccess: async (user, actionType) => {
        if (user.isChild || 
            user.identityLinkage?.is_temporary_id || 
            user.identityLinkage?.id_type === 'Parental Reference') {
            if (['marriage_registration', 'birth_registration', 'death_registration', 'independent_service', 'divorce_registration', 'adoption_registration'].includes(actionType)) {
                return {
                    allowed: false,
                    message: "Action Required: This service is BLOCKED for underage accounts or accounts under Parental Reference. You must update your profile with a unique National ID to resolve this reference linkage and upgrade to an Independent Citizen Account."
                };
            }
        }
        return { allowed: true };
    },

    /**
     * Helper to get current status for UI
     */
    getMaturityStatus: (user) => {
        if (!user.identityLinkage?.is_temporary_id) return 'none';

        const now = new Date();
        const fiveYearsInMs = 5 * 365.25 * 24 * 60 * 60 * 1000;
        const registrationAgeInMs = now - user.createdAt;

        if (registrationAgeInMs >= fiveYearsInMs) {
            return 'action_required';
        } else if (registrationAgeInMs >= (4 * 365.25 * 24 * 60 * 60 * 1000)) {
            // 1 Year warning period (4 years since registration)
            return 'warning';
        }
        return 'none';
    }
};

module.exports = identityLinkageService;
