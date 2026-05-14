const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');

const seedData = async () => {
  try {
    console.log('Connecting to database...');
    // Connect to your local DB
    await mongoose.connect('mongodb://127.0.0.1:27017/ethiopia-vital-events');
    console.log('Connected.');
    
    // Check if we need to insert users first to tie notifications to
    // For simplicity, we create a dummy notification with any random Object ID if no users exist
    let user = await User.findOne();
    let recipientId = user ? user._id : new mongoose.Types.ObjectId();

    console.log('Seeding notifications...');
    const seedNotifications = [
      {
        type: 'system',
        category: 'system',
        recipient: recipientId,
        message: 'Welcome to the Ethiopia Vital Events Registration System!',
        data: { info: "System update" },
        read: false,
        createdAt: new Date()
      },
      {
        type: 'citizen_registration',
        category: 'success',
        recipient: recipientId,
        message: 'A new citizen has been registered in your area.',
        read: false,
        createdAt: new Date(Date.now() - 86400000)
      },
      {
        type: 'event_completed',
        category: 'success',
        recipient: recipientId,
        message: 'Birth certificate processing has been completed.',
        read: true,
        createdAt: new Date(Date.now() - 2 * 86400000)
      }
    ];

    await Notification.insertMany(seedNotifications);
    console.log(`Successfully inserted ${seedNotifications.length} notifications!`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
