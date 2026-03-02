import mongoose from 'mongoose';

export interface IFolder {
  _id: string;
  name: string;
  description?: string;
  department: string;
  project?: string;
  parentFolder?: mongoose.Types.ObjectId;
  path: string; // Full path for easy navigation
  
  // Access Control
  createdBy: mongoose.Types.ObjectId;
  sharedWith: {
    userId?: mongoose.Types.ObjectId;
    role?: string;
    department?: string;
    permissions: ('view' | 'edit' | 'upload' | 'delete')[];
  }[];
  isPublic: boolean;
  
  // Metadata
  tags: string[];
  color?: string; // For UI customization
  icon?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    index: true
  },
  description: { 
    type: String 
  },
  department: { 
    type: String, 
    required: true,
    index: true
  },
  project: { 
    type: String,
    index: true
  },
  parentFolder: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Folder',
    index: true
  },
  path: { 
    type: String, 
    required: true,
    index: true
  },
  
  // Access Control
  createdBy: { 
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
      enum: ['view', 'edit', 'upload', 'delete']
    }]
  }],
  isPublic: { 
    type: Boolean, 
    default: false,
    index: true
  },
  
  // Metadata
  tags: [{ 
    type: String 
  }],
  color: { 
    type: String,
    default: '#3B82F6' // Blue
  },
  icon: { 
    type: String,
    default: 'folder'
  },
}, {
  timestamps: true,
});

// Compound indexes
folderSchema.index({ department: 1, parentFolder: 1 });
folderSchema.index({ path: 1 }, { unique: true });

export default mongoose.models.Folder || mongoose.model('Folder', folderSchema);
