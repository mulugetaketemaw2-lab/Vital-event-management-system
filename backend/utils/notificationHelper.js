const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Helper to create notifications consistently
 */
exports.notify = async ({ recipient, message, type = 'system', category = 'pending', data = {}, sender = null }) => {
  try {
    if (!recipient) return null;

    return await Notification.create({
      recipient,
      message,
      type,
      category,
      data,
      sender
    });
  } catch (error) {
    console.error('❌ Notification Error:', error);
    return null;
  }
};

/**
 * Notify all representatives at a specific level and location
 */
exports.notifyLocationReps = async ({ level, location, message, type, category, data }) => {
  try {
    const query = {
      role: { $in: [level, `${level}_representative`] },
      isActive: true
    };

    // Add location specific queries
    if (location.region) query['location.region'] = location.region;
    if (location.zone) query['location.zone'] = location.zone;
    if (location.woreda) query['location.woreda'] = location.woreda;
    if (location.kebele) query['location.kebele'] = location.kebele;

    const reps = await User.find(query);
    
    const promises = reps.map(rep => 
      this.notify({
        recipient: rep._id,
        message,
        type,
        category,
        data
      })
    );

    return await Promise.all(promises);
  } catch (error) {
    console.error('❌ Location Notification Error:', error);
    return [];
  }
};
