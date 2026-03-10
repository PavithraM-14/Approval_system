import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Role from '../models/Role';
import Company from '../models/Company';

async function seedAdmin() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }
    
    await connectDB();
    
    console.log('🌱 Seeding Admin Role, Company, and User...');

    // 1. Create or get Company
    let company = await Company.findOne({ adminEmail: 'admin@dmas.com' });
    
    if (!company) {
      company = await Company.create({
        name: 'DMAS Corporation',
        adminEmail: 'admin@dmas.com',
        adminContactNo: '+91 9999999999',
        isActive: true
      });
      console.log('✅ Company created');
    } else {
      console.log('ℹ️ Company already exists');
    }

    // 2. Create Admin Role
    let adminRole = await Role.findOne({ isSystemAdmin: true, company: company._id });
    
    if (!adminRole) {
      adminRole = await Role.create({
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
      console.log('✅ Admin Role created');
    } else {
      console.log('ℹ️ Admin Role already exists');
    }

    // 3. Create Admin User
    const adminEmail = 'admin@dmas.com';
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      adminUser = await User.create({
        name: 'System Administrator',
        email: adminEmail,
        empId: 'ADM001',
        password: 'adminPassword123', // Will be hashed by model
        role: adminRole._id,
        company: company._id,
        contactNo: '+91 9999999999',
        isVerified: true,
        isActive: true
      });
      console.log('✅ Admin User created (admin@dmas.com / adminPassword123)');
    } else {
      // Ensure existing admin has the right role ID and company
      adminUser.role = adminRole._id;
      adminUser.company = company._id;
      await adminUser.save();
      console.log('ℹ️ Admin User already exists, updated role and company references');
    }

    // 4. Update company with admin user reference
    if (!company.adminUserId || company.adminUserId.toString() !== adminUser._id.toString()) {
      company.adminUserId = adminUser._id;
      await company.save();
      console.log('✅ Company updated with admin user reference');
    }

    console.log('🎉 Admin seeding complete!');
    console.log('\n🏢 Company: DMAS Corporation');
    console.log('👥 Login: admin@dmas.com / adminPassword123');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedAdmin();
