// File validation utilities for upload security

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_FILES_PER_UPLOAD = 10;

// General file uploads (for regular attachments)
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'text/plain',
  'text/csv'
];

export const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv'
];

// Clarification uploads - PDF only
export const CLARIFICATION_ALLOWED_MIME_TYPES = [
  'application/pdf'
];

export const CLARIFICATION_ALLOWED_EXTENSIONS = [
  'pdf'
];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFile(file: File, isQuery: boolean = false): FileValidationResult {
  // Use appropriate validation rules based on context
  const allowedMimeTypes = isQuery ? CLARIFICATION_ALLOWED_MIME_TYPES : ALLOWED_MIME_TYPES;
  const allowedExtensions = isQuery ? CLARIFICATION_ALLOWED_EXTENSIONS : ALLOWED_EXTENSIONS;
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File "${file.name}" exceeds the 100MB size limit`
    };
  }

  // Check file extension first (more reliable than MIME type)
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    const extensionMessage = isQuery
      ? `Only PDF files are allowed for query uploads. "${file.name}" has extension "${extension}"`
      : `File extension "${extension}" is not allowed for "${file.name}". Allowed: ${allowedExtensions.join(', ')}`;
    return {
      isValid: false,
      error: extensionMessage
    };
  }

  // Check MIME type (if provided by browser)
  // Some browsers don't provide MIME type or provide generic ones, so we're lenient here
  if (file.type && !allowedMimeTypes.includes(file.type)) {
    // Only warn if extension is valid (extension takes precedence)
    console.warn(`File "${file.name}" has unexpected MIME type: ${file.type}, but extension is valid`);
  }

  // Check for potentially dangerous filenames
  // Only reject if .. is used for path traversal (with slashes)
  if (file.name.includes('../') || file.name.includes('..\\') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      isValid: false,
      error: `Invalid filename: "${file.name}"`
    };
  }

  return { isValid: true };
}

export function validateFiles(files: File[], isQuery: boolean = false): FileValidationResult {
  // Check number of files
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return {
      isValid: false,
      error: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed per upload`
    };
  }

  // Validate each file
  for (const file of files) {
    const result = validateFile(file, isQuery);
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
}

export function sanitizeFilename(filename: string): string {
  // Remove or replace dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 100); // Limit length
}

export function generateSecureFilename(originalName: string): string {
  // Extract extension
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  
  // Remove extension from name and sanitize
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const sanitizedName = sanitizeFilename(nameWithoutExt);
  
  // Return sanitized original filename
  return `${sanitizedName}.${extension}`;
}