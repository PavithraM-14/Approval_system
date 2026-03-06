import path from 'path';

// Test the file path construction
const filePath1 = '/uploads/sample-document.pdf';
const filePath2 = 'uploads/sample-document.pdf';

console.log('Testing file path construction:\n');

// Old way (WRONG)
console.log('❌ OLD WAY (causes double slash):');
const oldPath = path.join(process.cwd(), 'public', filePath1);
console.log(`Input: "${filePath1}"`);
console.log(`Output: "${oldPath}"`);
console.log('');

// New way (CORRECT)
console.log('✅ NEW WAY (correct):');
const cleanPath = filePath1.startsWith('/') ? filePath1.substring(1) : filePath1;
const newPath = path.join(process.cwd(), 'public', cleanPath);
console.log(`Input: "${filePath1}"`);
console.log(`Clean: "${cleanPath}"`);
console.log(`Output: "${newPath}"`);
console.log('');

// Check if file exists
const fs = require('fs');
if (fs.existsSync(newPath)) {
  console.log('✅ File exists at this path!');
} else {
  console.log('❌ File does not exist at this path');
}
