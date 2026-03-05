import mongoose from 'mongoose';

const documentVersionSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
        index: true
    },
    version: {
        type: Number,
        required: true
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
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    comment: {
        type: String
    }
}, {
    timestamps: true
});

// Avoid duplicate versions for the same document
documentVersionSchema.index({ documentId: 1, version: 1 }, { unique: true });

export default mongoose.models.DocumentVersion || mongoose.model('DocumentVersion', documentVersionSchema);
