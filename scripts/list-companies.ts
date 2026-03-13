#!/usr/bin/env node

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import Company from '../models/Company.js';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sead');
  
  const companies = await Company.find({});
  
  console.log(`Found ${companies.length} companies:\n`);
  
  for (const company of companies) {
    console.log(`- ${company.name} (${company._id})`);
  }
  
  await mongoose.disconnect();
}

main();
