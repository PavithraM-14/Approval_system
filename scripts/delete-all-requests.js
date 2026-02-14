const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const RequestSchema = new mongoose.Schema({}, { strict: false });

async function deleteAllRequests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const Request = mongoose.model('Request', RequestSchema);

    // Count requests before deletion
    const countBefore = await Request.countDocuments();
    console.log(`Found ${countBefore} requests in database`);

    if (countBefore === 0) {
      console.log('No requests to delete');
      await mongoose.connection.close();
      return;
    }

    // Delete all requests
    const result = await Request.deleteMany({});
    console.log(`\n✅ Successfully deleted ${result.deletedCount} requests`);

    // Verify deletion
    const countAfter = await Request.countDocuments();
    console.log(`Remaining requests: ${countAfter}`);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error deleting requests:', error);
    process.exit(1);
  }
}

deleteAllRequests();
