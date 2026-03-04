# How to Share YOUR Document (Not the Sample PDF)

## Current Situation

You have a share link that currently shows the sample PDF I created. You want it to show YOUR actual uploaded document instead.

## Solution: 2 Options

### Option 1: Use One of Your Existing Files (Quick)

You already have 26 PDF files in the uploads folder! Pick one and update the share link:

**Step 1: Choose a file from the list**

Available files:
1. `1757596046466-y1dl47ygho.pdf`
2. `1757596194788-4fnk4zbif0y.pdf`
3. `1757908654710-o1hazltopiq.pdf`
... (and 23 more)

**Step 2: Run this command**

```bash
npx tsx scripts/set-request-file.ts FILENAME.pdf "Your Document Title"
```

**Example:**
```bash
npx tsx scripts/set-request-file.ts 1766038876585-ptf0enhh5u.pdf "My Important Document"
```

This will:
- Update Request 225057 to use your file
- Update the share link to point to your file
- Change the document title

**Step 3: Refresh the share link page**

Press `F5` or `Ctrl + Shift + R` to see your document!

---

### Option 2: Upload a New File (Recommended for New Documents)

If you want to upload a completely new document:

**Step 1: Copy your file to uploads folder**

```bash
# Windows Command Prompt
copy "C:\path\to\your\document.pdf" "approval_system\public\uploads\"

# Or just drag and drop your file into:
# approval_system/public/uploads/
```

**Step 2: Update the share link**

```bash
npx tsx scripts/set-request-file.ts your-document.pdf "Your Document Title"
```

**Step 3: Refresh the share link page**

---

### Option 3: Create a New Request Through the UI (Best Practice)

This is the proper way to share documents in production:

**Step 1: Login**
- Go to `http://localhost:3000/login`
- Email: `john.doe@company.com`
- Password: `password123`

**Step 2: Create New Request**
- Click "Requests" in sidebar
- Click "Create New Request"
- Fill in the form
- **Upload your file** in Attachments section
- Submit

**Step 3: Share from Documents Page**
- Go to "Documents" page
- Find your request
- Click green "Share" button
- Generate link
- Copy and test

---

## Quick Example

Let's say you want to use file `1766038876585-ptf0enhh5u.pdf`:

```bash
cd approval_system
npx tsx scripts/set-request-file.ts 1766038876585-ptf0enhh5u.pdf "My Project Proposal"
```

Output:
```
✓ Connected to MongoDB
✓ File found: 1766038876585-ptf0enhh5u.pdf

Updating Request 225057...
✓ Updated Request 225057
  Title: My Project Proposal
  Attachments: [ '/uploads/1766038876585-ptf0enhh5u.pdf' ]

Updating share link...
✓ Updated share link
  File path: /uploads/1766038876585-ptf0enhh5u.pdf
  File name: 1766038876585-ptf0enhh5u.pdf

✅ Share URL: http://localhost:3000/share/2a9799c68a20367e6f21483590ac261863646080038883e41369058930a47885

🎉 Done! Your document is now shared.
   Refresh the share link page to see your document.
```

Then refresh your browser and you'll see YOUR document!

---

## What Gets Updated

When you run the script:

1. **Request 225057:**
   - Title: Changes to your specified title
   - Attachments: Points to your file

2. **Share Link:**
   - File path: Points to your file
   - File name: Your filename
   - Document name: Your title (shown on share page)

3. **Share Page Will Show:**
   - Your document title (not "Sample Request Document")
   - Your file will be viewed/downloaded (not the sample PDF)
   - Watermark will still be applied

---

## Troubleshooting

### Issue: "File not found"
**Solution:** Make sure the file exists in `approval_system/public/uploads/`

Check with:
```bash
dir approval_system\public\uploads\YOUR_FILE.pdf
```

### Issue: Still showing sample PDF
**Solution:** Hard refresh the page (Ctrl + Shift + R) or clear browser cache

### Issue: Want to use a different file
**Solution:** Just run the script again with a different filename

---

## Summary

**Quickest way to share YOUR document:**

1. Pick a file from the list (or copy your file to uploads folder)
2. Run: `npx tsx scripts/set-request-file.ts FILENAME.pdf "Title"`
3. Refresh the share link page
4. Done! Your document is now shared

**Your share link URL (same link, different content):**
```
http://localhost:3000/share/2a9799c68a20367e6f21483590ac261863646080038883e41369058930a47885
```

