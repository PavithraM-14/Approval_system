import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { UserRole } from './lib/types';

// Define protected routes and their required roles
// Note: GET requests are handled by the API routes themselves with proper permission checks
const protectedRoutes = {
  '/api/requests': {
    POST: [UserRole.REQUESTER], // Only requesters can create requests via API (legacy check)
  },
} as const;

function getJwtSecret(): Uint8Array {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Check if this is a protected route
  const routeConfig = protectedRoutes[pathname as keyof typeof protectedRoutes];
  if (!routeConfig) {
    return NextResponse.next();
  }

  // Get required roles for this route and method
  let requiredRoles: UserRole[];
  if (Array.isArray(routeConfig)) {
    requiredRoles = routeConfig;
  } else if (typeof routeConfig === 'object' && method in routeConfig) {
    requiredRoles = routeConfig[method as keyof typeof routeConfig] as UserRole[];
  } else {
    // No specific protection for this method, allow through
    return NextResponse.next();
  }

  // Get auth token from cookies
  const authToken = request.cookies.get('auth-token');
  if (!authToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify JWT token
    const secret = getJwtSecret();
    
    const { payload } = await jwtVerify(authToken.value, secret);
    const userRole = payload.role as string;

    // System Admins bypass all role checks
    if (userRole === 'system_admin') {
      return NextResponse.next();
    }

    // Check if user has required role
    if (!requiredRoles.includes(userRole as UserRole)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    // JWT verification failed
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: [
    '/api/requests',
  ],
};