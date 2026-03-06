import mongoose from 'mongoose';
import { UserRole } from '../lib/types';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  empId: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  signature: { type: String },
  college: { type: String },
  department: { type: String },
  contactNo: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  // OTP fields for email verification
  otp: { type: String, required: false },
  otpExpiry: { type: Date, required: false },
  isVerified: { type: Boolean, default: false },
  
  // Gmail integration
  gmailAccessToken: { type: String },
  gmailRefreshToken: { type: String },
  gmailTokenExpiry: { type: Date },
  gmailEnabled: { type: Boolean, default: false },
  
  // Google Drive integration
  driveAccessToken: { type: String },
  driveRefreshToken: { type: String },
  driveTokenExpiry: { type: Date },
  driveEnabled: { type: Boolean, default: false },
  driveFolderId: { type: String }, // Root folder for user's documents
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 10;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error: any) {
    next(error);
  }
});

export default mongoose.models.User || mongoose.model('User', userSchema);