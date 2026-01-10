// Migration script to add 6-digit requestId to existing requests
const { MongoClient } = require('mongodb');

async function migrateRequestIds() {
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/srm-approval');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const requests = db.collection('requests');
    
    // Find all requests without requestId
    const requestsWithoutId = await requests.find({ 
      requestId: { $exists: false } 
    }).toArray();
    
    console.log(`Found ${requestsWithoutId.length} requests without requestId`);
    
    const usedIds = new Set();
    
    // Get existing requestIds to avoid duplicates
    const existingIds = await requests.find({ 
      requestId: { $exists: true } 
    }, { projection: { requestId: 1 } }).toArray();
    
    existingIds.forEach(req => usedIds.add(req.requestId));
    
    let updated = 0;
    
    for (const request of requestsWithoutId) {
      let newId;
      let attempts = 0;
      
      // Generate unique 6-digit ID
      do {
        newId = Math.floor(100000 + Math.random() * 900000).toString();
        attempts++;
      } while (usedIds.has(newId) && attempts < 100);
      
      if (attempts >= 100) {
        console.error(`Failed to generate unique ID for request ${request._id}`);
        continue;
      }
      
      // Update the request with new requestId
      await requests.updateOne(
        { _id: request._id },
        { $set: { requestId: newId } }
      );
      
      usedIds.add(newId);
      updated++;
      
      console.log(`Updated request ${request._id} with requestId: ${newId}`);
    }
    
    console.log(`Successfully updated ${updated} requests with new requestIds`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

// Run the migration
migrateRequestIds();