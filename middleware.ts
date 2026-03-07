import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware is now minimal - most permission checks happen in API routes
// This allows for more flexible permission-based access control

function getJwtSecret(): Uint8Array {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function middleware(request: NextRequest) {
  // All permission checks are now handled in the API routes themselves
  // This middleware is kept minimal for future use if needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Currently no routes need middleware protection
    // All checks are done in API routes with permission-based logic
  ],
};