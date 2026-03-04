import mongoose from 'mongoose';

const shareLinkSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: false // Can be null for request attachments
    },
    requestAttachment: {
      filePath: String,
      fileName: String,
      requestId: String
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    accessCount: {
      type: Number,
      default: 0
    },
    maxAccessCount: {
      type: Number,
      default: null // null means unlimited
    },
    password: {
      type: String,
      default: null // Optional password protection
    },
    allowDownload: {
      type: Boolean,
      default: true
    },
    watermarkEnabled: {
      type: Boolean,
      default: true
    },
    accessLog: [{
      accessedAt: Date,
      ipAddress: String,
      userAgent: String
    }],
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient expiry checks
shareLinkSchema.index({ expiresAt: 1, isActive: 1 });

// Method to check if link is valid
shareLinkSchema.methods.isValid = function() {
  if (!this.isActive) return false;
  if (new Date() > this.expiresAt) return false;
  if (this.maxAccessCount && this.accessCount >= this.maxAccessCount) return false;
  return true;
};

// Method to log access
shareLinkSchema.methods.logAccess = async function(ipAddress: string, userAgent: string) {
  this.accessCount += 1;
  this.accessLog.push({
    accessedAt: new Date(),
    ipAddress,
    userAgent
  });
  await this.save();
};

const ShareLink = mongoose.models.ShareLink || mongoose.model('ShareLink', shareLinkSchema);

export default ShareLink;
