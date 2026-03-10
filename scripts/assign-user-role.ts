import mongoose from 'mongoose';
import User from '../models/User';
import UserRoleAssignment from '../models/UserRoleAssignment';
import CustomRole from '../models/CustomRole';

async function assignUserRole() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sead');
    console.log('Connected to MongoDB');

    // Find the user from the logs
    const userId = '69b0630766da97b7d53a632e';
    const user = await User.findById(userId).populate('role company');
    
    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User found:');
    console.log(`- ID: ${user._id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Name: ${user.name}`);
    console.log(`- Role: ${user.role?.name}`);
    console.log(`- Company: ${user.company}`);

    // Find the role that the workflow is expecting
    const expectedRoleId = '69b0616bc9d2229514b31b23';
    const expectedRole = await CustomRole.findById(expectedRoleId);
    
    if (!expectedRole) {
      console.log('Expected role not found');
      return;
    }

    console.log('\nExpected role:');
    console.log(`- ID: ${expectedRole._id}`);
    console.log(`- Name: ${expectedRole.name}`);
    console.log(`- Company: ${expectedRole.companyId}`);

    // Check if user already has this role assignment
    const existingAssignment = await UserRoleAssignment.findOne({
      userId: user._id,
      roleId: expectedRole._id
    });

    if (existingAssignment) {
      console.log('\nUser already has this role assignment');
      return;
    }

    // Create the role assignment
    const assignment = new UserRoleAssignment({
      userId: user._id,
      roleId: expectedRole._id,
      companyId: user.company,
      assignedBy: user._id, // Self-assigned for this fix
      assignedAt: new Date()
    });

    await assignment.save();
    console.log('\n✅ Successfully assigned role to user');
    console.log(`- User: ${user.email}`);
    console.log(`- Role: ${expectedRole.name}`);

  } catch (error) {
    console.error('❌ Error assigning user role:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the assignment if this script is executed directly
if (require.main === module) {
  assignUserRole();
}

export default assignUserRole;