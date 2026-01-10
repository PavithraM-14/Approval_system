import Request from '../models/Request';

/**
 * Generates a unique 6-digit request ID
 * @returns Promise<string> - A unique 6-digit ID
 */
export async function generateRequestId(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    // Generate a random 6-digit number (100000 to 999999)
    const id = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Check if this ID already exists
    const existingRequest = await Request.findOne({ requestId: id });
    
    if (!existingRequest) {
      return id;
    }
    
    attempts++;
  }
  
  throw new Error('Unable to generate unique request ID after maximum attempts');
}