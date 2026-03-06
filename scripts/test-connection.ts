import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function testConnection() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in environment variables');
    process.exit(1);
  }

  console.log('🔄 Attempting to connect to MongoDB...');
  console.log('📍 URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Hide password

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB connected successfully!');
    
    // Check if db is available
    if (mongoose.connection.db) {
      console.log('📊 Database:', mongoose.connection.db.databaseName);
      console.log('🌐 Host:', mongoose.connection.host);
      console.log('📡 Connection state:', mongoose.connection.readyState === 1 ? 'Connected' : 'Not Connected');

      // List collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('\n📁 Collections in database:');
      if (collections.length === 0) {
        console.log('   (No collections yet - database is empty)');
      } else {
        collections.forEach((col) => {
          console.log(`   - ${col.name}`);
        });
      }
    } else {
      console.log('⚠️ Database connection established but db object not available');
    }

    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ MongoDB connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('\n💡 Tip: Check your username and password in MONGODB_URI');
    } else if (error.message.includes('network')) {
      console.error('\n💡 Tip: Check your internet connection and MongoDB Atlas IP whitelist');
    }
    
    process.exit(1);
  }
}

testConnection();
