import dotenv from 'dotenv';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Role from '../models/Role';
import CustomRole from '../models/CustomRole';
import UserRoleAssignment from '../models/UserRoleAssignment';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function fixCompanyAdminRole() {
  await connectDB();

  console.log('🔧 Fixing company admin role assignment...');
  
  // Find users who have a role field but no UserRoleAssignment
  const usersWithOldRole = await User.find({ role: { $exists: true } });
  
  console.log(`📊 Found ${usersWithOldRole.length} users with old role system`);
  
  for (const user of usersWithOldRole) {
    // Check if they already have a UserRoleAssignment
    const existingAssignment = await UserRoleAssignment.findOne({ userId: user._id });
    
    if (existingAssignment) {
      console.log(`✅ ${user.email} already has role assignment`);
      continue;
    }
    
    // Get the old role
    const oldRole = await Role.findById(user.role);
    if (!oldRole) {
      console.log(`❌ Old role not found for ${user.email}`);
      continue;
    }
    
    // Find or create equivalent CustomRole
    let customRole = await CustomRole.findOne({ name: oldRole.name });
    
    if (!customRole) {
      console.log(`📝 Creating CustomRole for: ${oldRole.name}`);
      customRole = await CustomRole.create({
        name: oldRole.name,
        description: oldRole.description,
        isSystemAdmin: oldRole.isSystemAdmin,
        permissions: oldRole.permissions,
        companyId: user.company,
      });
    }
    
    // Create UserRoleAssignment
    await UserRoleAssignment.create({
      userId: user._id,
      roleId: customRole._id,
      companyId: user.company,
    });
    
    console.log(`✅ Created role assignment for ${user.email} -> ${customRole.name}`);
  }
  
  console.log('\n🎉 Role assignment fix completed!');
  console.log('💡 You should now be able to log in with your company credentials.');
  
  process.exit(0);
}

fixCompanyAdminRole().catch(err => {
  console.error('❌ Failed to fix role assignments:', err);
  process.exit(1);
});