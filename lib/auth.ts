import { cookies } from 'next/headers';
import { Role as IRole } from './types';
import { jwtVerify } from 'jose';
import connectDB from './mongodb';
import User from '../models/User';
import CustomRole from '../models/CustomRole';
import UserRoleAssignment from '../models/UserRoleAssignment';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  empId?: string;
  role: IRole;
  college?: string;
  department?: string;
  companyId?: string;
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
        
        // Get user and their role through UserRoleAssignment
        const user = await User.findById(payload.id).lean();
        
        if (!user) {
          console.error('User not found in DB for payload:', payload.id);
          return null;
        }
        
        // Get role through UserRoleAssignment
        const roleAssignment = await UserRoleAssignment.findOne({ userId: user._id }).lean();
        if (!roleAssignment) {
          console.error('Role assignment not found for user:', payload.id);
          return null;
        }
        
        const role = await CustomRole.findById(roleAssignment.roleId).lean();
        if (!role) {
          console.error('Role not found for user:', payload.id);
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          empId: user.empId,
          role: role as unknown as IRole,
          college: user.college,
          department: user.department,
          companyId: user.company?.toString(),
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
