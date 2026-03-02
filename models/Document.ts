import mongoose from 'mongoose';

export interface IDocument {
  _id: string;
  title: string;
  description?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  
  // Organization
  department: string;
  project?: string;
  category: string;
  
  // Metadata
  tags: string[];
  keywords: string[];
  status: 'draft' | 'active' | 'archived' | 'deleted';
  version: number;
  
  // Access Control
  uploadedBy: mongoose.Types.ObjectId;
  sharedWith: {
    userId?: mongoose.Types.ObjectId;
    role?: string;
    department?: string;
    permissions: ('view' | 'edit' | 'download' | 'delete')[];
  }[];
  isPublic: boolean;
  
  // Related entities
  requestId?: mongoose.Types.ObjectId;
  parentFolder?: mongoose.Types.ObjectId;
  
  // Full-text search fields
  searchableContent?: string;
  
  // Audit
  downloadCount: number;
  viewCount: number;
  lastAccessedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    index: 'text' // Text index for search
  },
  description: { 
    type: String,
    index: 'text' // Text index for search
  },
  fileName: { 
    type: String, 
    required: true 
  },
  filePath: { 
    type: String, 
    required: true 
  },
  fileSize: { 
    type: Number, 
    required: true 
  },
  fileType: { 
    type: String, 
    required: true 
  },
  mimeType: { 
    type: String, 
    required: true 
  },
  
  // Organization
  department: { 
    type: String, 
    required: true,
    index: true 
  },
  project: { 
    type: String,
    index: true 
  },
  category: { 
    type: String, 
    required: true,
    enum: [
      'Policy',
      'Procedure',
      'Form',
      'Report',
      'Contract',
      'Invoice',
      'Receipt',
      'Proposal',
      'Presentation',
      'Spreadsheet',
      'Image',
      'Other'
    ],
    index: true
  },
  
  // Metadata
  tags: [{ 
    type: String,
    index: true 
  }],
  keywords: [{ 
    type: String,
    index: 'text' // Text index for search
  }],
  status: { 
    type: String, 
    enum: ['draft', 'active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },
  version: { 
    type: Number, 
    default: 1 
  },
  
  // Access Control
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  sharedWith: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    role: { 
      type: String 
    },
    department: { 
      type: String 
    },
    permissions: [{
      type: String,
      enum: ['view', 'edit', 'download', 'delete']
    }]
  }],
  isPublic: { 
    type: Boolean, 
    default: false,
    index: true
  },
  
  // Related entities
  requestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Request',
    index: true
  },
  parentFolder: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Folder',
    index: true
  },
  
  // Full-text search
  searchableContent: { 
    type: String,
    index: 'text' // Text index for search
  },
  
  // Audit
  downloadCount: { 
    type: Number, 
    default: 0 
  },
  viewCount: { 
    type: Number, 
    default: 0 
  },
  lastAccessedAt: { 
    type: Date 
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
documentSchema.index({ department: 1, status: 1, createdAt: -1 });
documentSchema.index({ uploadedBy: 1, status: 1 });
documentSchema.index({ tags: 1, status: 1 });
documentSchema.index({ project: 1, status: 1 });

// Text index for full-text search
documentSchema.index({
  title: 'text',
  description: 'text',
  keywords: 'text',
  searchableContent: 'text'
}, {
  weights: {
    title: 10,
    keywords: 5,
    description: 3,
    searchableContent: 1
  }
});

export default mongoose.models.Document || mongoose.model('Document', documentSchema);
