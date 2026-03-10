import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Company from '../models/Company';

async function fixUserCompany() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }
    
    await connectDB();
    
    console.log('🔧 Fixing user company associations...');

    // Find or create default company
    let company = await Company.findOne({});
    
    if (!company) {
      console.log('📦 Creating default company...');
      company = await Company.create({
        name: 'DMAS Corporation',
        adminEmail: 'admin@dmas.com',
        adminContactNo: '+91 9999999999',
        isActive: true
      });
      console.log('✅ Company created:', company.name);
    } else {
      console.log('✅ Found existing company:', company.name);
    }

    // Update all users without a company
    const usersWithoutCompany = await User.find({ company: { $exists: false } });
    
    if (usersWithoutCompany.length === 0) {
      console.log('✅ All users already have a company assigned');
    } else {
      console.log(`📝 Updating ${usersWithoutCompany.length} users...`);
      
      for (const user of usersWithoutCompany) {
        user.company = company._id;
        await user.save();
        console.log(`  ✓ Updated user: ${user.email}`);
      }
      
      console.log('✅ All users updated with company');
    }

    // Update company admin reference if not set
    const adminUser = await User.findOne({ email: 'admin@dmas.com' });
    if (adminUser && (!company.adminUserId || company.adminUserId.toString() !== adminUser._id.toString())) {
      company.adminUserId = adminUser._id;
      await company.save();
      console.log('✅ Company admin reference updated');
    }

    console.log('🎉 Fix complete!');
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixUserCompany();
