import { NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import Request from '../../../models/Request';
import { generateRequestId } from '../../../lib/id-generator';

export async function POST() {
  try {
    await connectDB();
    
    // Find all requests without requestId
    const requestsWithoutId = await Request.find({ 
      requestId: { $exists: false } 
    });
    
    console.log(`Found ${requestsWithoutId.length} requests without requestId`);
    
    let updated = 0;
    const errors = [];
    
    for (const request of requestsWithoutId) {
      try {
        // Generate unique 6-digit ID
        const newRequestId = await generateRequestId();
        
        // Update the request
        await Request.updateOne(
          { _id: request._id },
          { $set: { requestId: newRequestId } }
        );
        
        updated++;
        console.log(`Updated request ${request._id} with requestId: ${newRequestId}`);
        
      } catch (error) {
        console.error(`Failed to update request ${request._id}:`, error);
        errors.push({
          requestId: request._id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updated} requests with new requestIds`,
      totalFound: requestsWithoutId.length,
      updated,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}