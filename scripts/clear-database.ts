import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

import connectDB from '../lib/mongodb';

async function clearDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();

    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('✅ Database is already empty');
      process.exit(0);
    }

    console.log(`📋 Found ${collections.length} collections`);
    
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`🗑️  Dropping collection: ${collectionName}`);
      await mongoose.connection.db.dropCollection(collectionName);
    }

    console.log('✅ Database cleared successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
