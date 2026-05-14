const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/ethiopia-vital-events').then(async () => {
  // Find a citizen or rep user (first approved one)
  const user = await User.findOne({ role: 'citizen', location: { $exists: true } }).select('username location').lean();
  
  if (!user) {
    console.log('No citizen with location found, checking reps...');
    const rep = await User.findOne({ role: { $ne: 'national' }, location: { $exists: true } }).select('username role location').lean();
    if (rep) {
      console.log('Rep user location:', JSON.stringify(rep, null, 2));
    } else {
      console.log('No user with location found');
    }
  } else {
    console.log('Citizen user location:', JSON.stringify(user, null, 2));
  }
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
