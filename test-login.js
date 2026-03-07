// Quick test to verify login credentials
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017/approval_system';

async function testLogin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get User model
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      password: String,
      name: String,
      role: mongoose.Schema.Types.ObjectId
    }));

    // Find admin user
    const user = await User.findOne({ email: 'admin@dmas.com' });
    
    if (!user) {
      console.log('❌ User not found with email: admin@dmas.com');
      console.log('\nLet me check what users exist:');
      const allUsers = await User.find({}).select('email name');
      console.log('All users:', allUsers);
    } else {
      console.log('✅ User found:', user.email);
      console.log('Name:', user.name);
      
      // Test password
      const testPassword = 'adminPassword123';
      const isMatch = await bcrypt.compare(testPassword, user.password);
      
      if (isMatch) {
        console.log('✅ Password matches!');
      } else {
        console.log('❌ Password does NOT match');
        console.log('Stored hash:', user.password);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testLogin();
