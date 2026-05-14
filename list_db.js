const mongoose = require('mongoose');

async function listCollections() {
    try {
        const uri = 'mongodb://localhost:27017/ethiopia-vital-events';
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log('Collections:');
        for (let col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(` - ${col.name}: ${count} documents`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

listCollections();
