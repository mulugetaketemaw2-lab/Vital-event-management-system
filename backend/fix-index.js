const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ethiopia-vital-events');
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // 1. Drop the old index if it exists
    try {
      await collection.dropIndex('personalInfo.idNumber_1');
      console.log('✅ Dropped old index: personalInfo.idNumber_1');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  Old index does not exist, continuing...');
      } else {
        throw error;
      }
    }

    // 2. Create the new partial unique index
    await collection.createIndex(
      { 'personalInfo.idNumber': 1 },
      {
        unique: true,
        partialFilterExpression: {
          'personalInfo.idNumber': { $type: 'string', $ne: '' }
        },
        name: 'personalInfo.idNumber_unique_partial'
      }
    );
    console.log('✅ Created new partial unique index for personalInfo.idNumber');

    // 3. Verify the index was created
    const indexes = await collection.indexes();
    const newIndex = indexes.find(idx => idx.name === 'personalInfo.idNumber_unique_partial');
    
    if (newIndex) {
      console.log('✅ Index verification successful:', newIndex.name);
    } else {
      console.log('❌ Index verification failed');
    }

    console.log('\n🎉 Index fix completed successfully!');
    console.log('📝 You can now create multiple representatives without idNumber');
    console.log('🔄 Please restart your backend server');

  } catch (error) {
    console.error('❌ Error fixing index:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
fixIndex();
