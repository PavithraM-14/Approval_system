import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import CustomRole from '../models/CustomRole';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function updateParallelRoles() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    console.log('Updating Legal, Finance, and IT roles...\n');

    // Update Legal role
    const legalRole = await CustomRole.findOne({ name: 'Legal' });
    if (legalRole) {
      if (!legalRole.permissions) {
        legalRole.permissions = {} as any;
      }
      legalRole.permissions.canForward = true;
      legalRole.permissions.canApprove = false;
      await legalRole.save();
      console.log('✓ Updated Legal role:');
      console.log('  - canForward: true');
      console.log('  - canApprove: false');
    } else {
      console.log('✗ Legal role not found');
    }

    // Update Finance role
    const financeRole = await CustomRole.findOne({ name: 'Finance' });
    if (financeRole) {
      if (!financeRole.permissions) {
        financeRole.permissions = {} as any;
      }
      financeRole.permissions.canForward = true;
      financeRole.permissions.canApprove = false;
      await financeRole.save();
      console.log('\n✓ Updated Finance role:');
      console.log('  - canForward: true');
      console.log('  - canApprove: false');
    } else {
      console.log('\n✗ Finance role not found');
    }

    // Update IT role
    const itRole = await CustomRole.findOne({ name: 'IT' });
    if (itRole) {
      if (!itRole.permissions) {
        itRole.permissions = {} as any;
      }
      itRole.permissions.canForward = true;
      itRole.permissions.canApprove = false;
      await itRole.save();
      console.log('\n✓ Updated IT role:');
      console.log('  - canForward: true');
      console.log('  - canApprove: false');
    } else {
      console.log('\n✗ IT role not found');
    }

    console.log('\n✅ All roles updated successfully!');
    console.log('\nThese roles can now forward requests to the next level (CEO)');
    console.log('instead of being final approvers.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

updateParallelRoles();
