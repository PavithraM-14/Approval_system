#!/usr/bin/env node

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import CustomRole from '../models/CustomRole.js';
import Company from '../models/Company.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sead');
  
  const company = await Company.findOne({ name: 'Default Company' });
  if (!company) {
    console.log('No company found');
    process.exit(1);
  }
  
  const roles = await CustomRole.find({ companyId: company._id });
  
  console.log(`Found ${roles.length} roles:\n`);
  
  for (const role of roles) {
    console.log(`Role: ${role.name}`);
    console.log(`  ID: ${role._id}`);
    console.log(`  Permissions:`, JSON.stringify(role.permissions, null, 2));
    console.log('');
  }
  
  await mongoose.disconnect();
}

main();
