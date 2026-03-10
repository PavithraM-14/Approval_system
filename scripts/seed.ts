import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Role from '../models/Role';
import Company from '../models/Company';
import Request from '../models/Request';
import BudgetRecord from '../models/BudgetRecord';
import SOPRecord from '../models/SOPRecord';
import { UserRole } from '../lib/types';

async function seed() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }
    
    await connectDB();
    
    console.log('🌱 Starting minimal database seed...');

    // Clear existing data
    await Role.deleteMany({});
    await User.deleteMany({});
    await Company.deleteMany({});
    await Request.deleteMany({});
    await BudgetRecord.deleteMany({});
    await SOPRecord.deleteMany({});

    // 1. Create Company
    console.log('🏢 Creating default company...');
    const company = await Company.create({
      name: 'DMAS Corporation',
      adminEmail: 'admin@dmas.com',
      adminContactNo: '+91 9999999999',
      isActive: true
    });

    // 2. Create System Admin Role
    console.log('🛡️ Creating System Admin Role...');
    const adminRole = await Role.create({
      name: 'System Admin',
      description: 'Full system access with all permissions',
      company: company._id,
      isSystemAdmin: true,
      permissions: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canShare: true,
        canDownload: true,
        canForward: true,
        canManageBudget: true,
        canESign: true,
        canApprove: true,
        canRaiseQueries: true,
      }
    });

    // 3. Create Standard Role Templates (Optional, but helpful)
    console.log('👥 Creating standard role templates...');
    await Role.create([
      {
        name: 'Requester',
        description: 'Basic user who can create and view their own requests',
        company: company._id,
        isSystemAdmin: false,
        permissions: {
          canView: true,
          canCreate: true,
          canEdit: true,
          canShare: false,
          canDownload: true,
          canForward: false,
          canManageBudget: false,
          canESign: false,
          canApprove: false,
          canRaiseQueries: false,
        }
      },
      {
        name: 'Approver',
        description: 'Standard approver with e-signature rights',
        company: company._id,
        isSystemAdmin: false,
        permissions: {
          canView: true,
          canCreate: false,
          canEdit: false,
          canShare: true,
          canDownload: true,
          canForward: false,
          canManageBudget: false,
          canESign: true,
          canApprove: true,
          canRaiseQueries: true,
        }
      }
    ]);

    // 4. Create initial System Admin user
    console.log('👤 Creating initial System Admin user...');
    const adminUser = await User.create({
      email: 'admin@dmas.com',
      name: 'System Administrator',
      empId: 'ADM001',
      contactNo: '+91 9999999999',
      password: 'adminPassword123',
      role: adminRole._id,
      company: company._id,
      isVerified: true,
      isActive: true
    });

    // 5. Update company with admin user reference
    company.adminUserId = adminUser._id;
    await company.save();

    console.log('🎉 Minimal seed complete!');
    console.log('\n🏢 Company: DMAS Corporation');
    console.log('👥 Login Credentials:');
    console.log('Email: admin@dmas.com');
    console.log('Password: adminPassword123');

  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seed();
}

export default seed;
