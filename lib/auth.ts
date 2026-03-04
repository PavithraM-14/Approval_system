import { cookies } from 'next/headers';
import { Role as IRole } from './types';
import { jwtVerify } from 'jose';
import connectDB from './mongodb';
import User from '../models/User';
import Role from '../models/Role'; // This registers the model

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  empId?: string;
  role: IRole;
  college?: string;
  department?: string;
}

function getJwtSecret(): Uint8Array {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies();
    
    // Check for JWT auth token
    const authToken = cookieStore.get('auth-token');
    if (authToken) {
      try {
        const secret = getJwtSecret();
        const { payload } = await jwtVerify(authToken.value, secret);
        
        await connectDB();
        
        // Ensure models are registered by referencing them
        // This is a common pattern to fix MissingSchemaError in Next.js dev mode
        const user = await User.findById(payload.id)
          .populate({
            path: 'role',
            model: Role
          })
          .lean();
        
        if (!user || !user.role) {
          console.error('User or role not found in DB for payload:', payload.id);
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          empId: user.empId,
          role: user.role as unknown as IRole,
          college: user.college,
          department: user.department,
        };
      } catch (jwtError) {
        console.error('JWT/DB Auth Error:', jwtError);
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('getCurrentUser global error:', error);
    return null;
  }
}

export function hasPermission(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

// These helper functions might need refactoring later to use permission flags
// but keeping them for now to maintain compatibility with existing code
export function canApproveRequest(userRole: string, requestStatus: string): boolean {
  const approvalMatrix: Record<string, string[]> = {
    'submitted': ['institution_manager'],
    'manager_review': ['institution_manager', 'accountant'],
    'budget_check': ['accountant'],
    'vp_approval': ['vp'],
    'hoi_approval': ['head_of_institution'],
    'dean_review': ['dean'],
    'department_checks': ['mma', 'hr', 'audit', 'it'],
    'dean_verification': ['dean'],
    'chief_director_approval': ['chief_director'],
    'chairman_approval': ['chairman'],
  };

  return approvalMatrix[requestStatus]?.includes(userRole) || false;
}

export function canCreateRequest(userRole: string): boolean {
  return userRole === 'requester';
}
