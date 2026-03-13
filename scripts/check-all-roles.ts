import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import CustomRole from '../models/CustomRole';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkAllRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    const roles = await CustomRole.find({});
    console.log(`Found ${roles.length} CustomRole(s):\n`);

    roles.forEach(role => {
      console.log(`- ${role.name} (ID: ${role._id})`);
      console.log(`  Permissions:`, role.permissions);
      console.log();
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkAllRoles();
