const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const citizens = await User.find({ role: 'citizen' })
    .select('username personalInfo.firstName personalInfo.lastName personalInfo.gender isActive isApproved status identityLinkage')
    .limit(10);

  console.log('Citizens found:', citizens.length);
  citizens.forEach(c => {
    console.log({
      username: c.username,
      name: `${c.personalInfo?.firstName} ${c.personalInfo?.lastName}`,
      gender: c.personalInfo?.gender,
      isActive: c.isActive,
      isApproved: c.isApproved,
      status: c.status,
      identityLinkage_banned: c.identityLinkage?.is_banned,
      identityLinkage_status: c.identityLinkage?.id_type
    });
  });
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
