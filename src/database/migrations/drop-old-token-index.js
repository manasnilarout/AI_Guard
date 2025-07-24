// Migration to drop old 'token' index from personalaccesstokens collection
// This fixes the E11000 duplicate key error when creating tokens

const mongoose = require('mongoose');

async function dropOldTokenIndex() {
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_guard';

  try {
    await mongoose.connect(mongoUrl, { dbName: 'ai_guard' });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('personalaccesstokens');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // Check if old 'token_1' index exists
    const hasOldTokenIndex = indexes.some(idx => idx.name === 'token_1');
    
    if (hasOldTokenIndex) {
      console.log('Found old token_1 index, dropping it...');
      await collection.dropIndex('token_1');
      console.log('Successfully dropped old token_1 index');
    } else {
      console.log('Old token_1 index not found, migration not needed');
    }

    // Verify current indexes
    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', finalIndexes.map(idx => idx.name));

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

if (require.main === module) {
  dropOldTokenIndex()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { dropOldTokenIndex };