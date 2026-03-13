#!/usr/bin/env node

/**
 * Diagnostic script to check user company associations
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import User from '../models/User.js';
import Company from '../models/Company.js';
import Group from '../models/Group.js';
import Role from '../models/Role.js';

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function checkUserCompany() {
  await connectDB();
  
  console.log('\n=== Checking User-Company Associations ===\n');
  
  // Get all users
  const users = await User.find({}).lean();
  console.log(`Found ${users.length} users:\n`);
  
  for (const user of users) {
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`  - ID: ${user._id}`);
    console.log(`  - Role ID: ${user.role || 'N/A'}`);
    console.log(`  - Company ID: ${user.company || 'MISSING'}`);
    console.log('');
  }
  
  // Get all companies
  const companies = await Company.find({});
  console.log(`\n=== Companies ===\n`);
  console.log(`Found ${companies.length} companies:\n`);
  
  for (const company of companies) {
    console.log(`Company: ${company.name}`);
    console.log(`  - ID: ${company._id}`);
    console.log('');
  }
  
  // Get all groups
  const groups = await Group.find({}).lean();
  console.log(`\n=== Groups ===\n`);
  console.log(`Found ${groups.length} groups:\n`);
  
  for (const group of groups) {
    console.log(`Group: ${group.name} (${group.type})`);
    console.log(`  - ID: ${group._id}`);
    console.log(`  - Company ID: ${group.companyId || 'MISSING'}`);
    console.log('');
  }
  
  await mongoose.disconnect();
  console.log('✓ Disconnected from MongoDB');
}

checkUserCompany().catch(console.error);
