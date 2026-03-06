import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function deleteAllRequests() {
  try {
    console.log('⚠️  WARNING: This will delete ALL requests from the database!');
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('✓ Connected to MongoDB');

    // Get Request model
    const Request = mongoose.models.Request || mongoose.model('Request', new mongoose.Schema({}, { strict: false }));

    // Count requests before deletion
    const countBefore = await Request.countDocuments();
    console.log(`\nFound ${countBefore} request(s) in database`);

    if (countBefore === 0) {
      console.log('No requests to delete.');
      await mongoose.disconnect();
      return;
    }

    // Delete all requests
    console.log('\nDeleting all requests...');
    const result = await Request.deleteMany({});
    
    console.log(`\n✓ Successfully deleted ${result.deletedCount} request(s)`);

    // Verify deletion
    const countAfter = await Request.countDocuments();
    console.log(`✓ Remaining requests: ${countAfter}`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

deleteAllRequests();
