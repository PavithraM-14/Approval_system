# Testing Guide for Changes

## Quick Test Checklist

### 1. Environment Setup
```bash
# Copy .env.example to .env.local
cp .env.example .env.local

# Update .env.local with your values
# MONGODB_URI=your-mongodb-connection-string
# NEXT_PUBLIC_APP_NAME=Approval System
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Test
```bash
npm run build
```
Expected: Build completes without errors

### 4. Development Server
```bash
npm run dev
```
Expected: Server starts on http://localhost:3000

### 5. Visual Tests

#### Test 1: Login Page
1. Navigate to http://localhost:3000/login
2. Check: Page loads without errors
3. Check: No "SRM" text visible

#### Test 2: Dashboard
1. Login with test credentials
2. Check sidebar: Should show "Approval System"
3. Check header: Should show "Approval System"
4. Check: No "SRM" or "SRM-RMP" text visible

#### Test 3: Notifications
1. Click notification bell icon
2. Check: Dropdown opens
3. Check: No "SRM" references in notifications

#### Test 4: Documents Page
1. Navigate to Documents from sidebar
2. Check: Page loads correctly
3. Check: Title shows "Document Library"

### 6. Functional Tests

#### Test 1: Create Request
```bash
# As a requester
1. Go to "Create Request"
2. Fill in form
3. Submit
4. Check: Request created successfully
5. Check: Notification sent (check email if configured)
```

#### Test 2: Search Requests
```bash
1. Go to "My Requests" or "Pending Approvals"
2. Use search bar
3. Enter search term
4. Check: Search results appear
5. Check: Filters work
```

#### Test 3: Notifications
```bash
1. Perform an action (create request, approve, etc.)
2. Check: Notification appears in bell
3. Check: Email sent (if configured)
4. Check: Email shows "Approval System" not "SRM"
```

#### Test 4: Document Upload
```bash
1. Go to Documents page
2. Click "Upload Document"
3. Select file
4. Fill metadata
5. Upload
6. Check: Document appears in list
```

### 7. Email Tests (If Email Configured)

#### Test 1: OTP Email
```bash
1. Sign up new user
2. Check email received
3. Verify: From "Approval System"
4. Verify: Footer shows "Approval System"
5. Verify: No "SRM" references
```

#### Test 2: Notification Email
```bash
1. Create a request
2. Check approver's email
3. Verify: From "Approval System"
4. Verify: Subject and body correct
5. Verify: No "SRM" references
```

### 8. Database Tests

#### Test 1: Existing Data
```bash
# If you have existing data
1. Login with existing user
2. Check: Old requests visible
3. Check: Old notifications visible
4. Check: Everything works normally
```

#### Test 2: New Data
```bash
1. Create new request
2. Check database: Request saved
3. Check: No "SRM" in stored data
```

### 9. API Tests

#### Test 1: Health Check
```bash
curl http://localhost:3000/api/health
```
Expected: `{"status":"ok"}`

#### Test 2: Requests API
```bash
# Login first to get cookie, then:
curl http://localhost:3000/api/requests \
  -H "Cookie: your-session-cookie"
```
Expected: JSON response with requests

#### Test 3: Notifications API
```bash
curl http://localhost:3000/api/notifications \
  -H "Cookie: your-session-cookie"
```
Expected: JSON response with notifications

### 10. Search Tests

#### Test 1: Request Search
```bash
1. Go to requests page
2. Click search/filters
3. Enter: "test"
4. Check: Results appear
5. Try different filters
6. Check: Filters work correctly
```

#### Test 2: Document Search
```bash
1. Go to documents page
2. Use search bar
3. Enter keywords
4. Check: Documents filtered
5. Try category filter
6. Check: Filter works
```

## Automated Test Commands

```bash
# Run linter
npm run lint

# Run type check
npx tsc --noEmit

# Check for "SRM" in code (should only find in package-lock.json)
grep -r "SRM" --exclude-dir=node_modules --exclude=package-lock.json .
```

## Expected Results

### ✅ Pass Criteria
- No TypeScript errors
- No build errors
- All pages load correctly
- No "SRM" or "SRM-RMP" visible in UI
- Emails show "Approval System"
- All features work as before
- Database operations successful

### ❌ Fail Criteria
- Build fails
- TypeScript errors
- "SRM" visible in UI
- Features broken
- Emails not sent
- Database errors

## Troubleshooting

### Issue: Build Fails
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Issue: Environment Variables Not Working
```bash
# Check .env.local exists
ls -la .env.local

# Restart dev server
# Stop server (Ctrl+C)
npm run dev
```

### Issue: Database Connection Error
```bash
# Check MONGODB_URI in .env.local
# Verify MongoDB is accessible
# Check network connection
```

### Issue: "SRM" Still Visible
```bash
# Search for remaining references
grep -r "SRM" app/ lib/ components/

# Update any found files
```

## Performance Tests

### Test 1: Page Load Speed
```bash
# Use browser DevTools
1. Open Network tab
2. Navigate to dashboard
3. Check: Load time < 2 seconds
```

### Test 2: Search Performance
```bash
1. Search with 100+ results
2. Check: Results appear < 1 second
3. Check: No lag in UI
```

### Test 3: Document Upload
```bash
1. Upload 10MB file
2. Check: Upload completes
3. Check: No timeout errors
```

## Security Tests

### Test 1: Authentication
```bash
# Try accessing protected route without login
curl http://localhost:3000/api/requests
# Expected: 401 Unauthorized
```

### Test 2: Authorization
```bash
# Try accessing another user's data
# Expected: 403 Forbidden or filtered results
```

### Test 3: File Upload
```bash
# Try uploading malicious file
# Expected: Validation error or safe handling
```

## Final Checklist

- [ ] All visual tests passed
- [ ] All functional tests passed
- [ ] All API tests passed
- [ ] Email tests passed (if configured)
- [ ] No "SRM" references in UI
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build successful
- [ ] Database operations work
- [ ] Search functionality works
- [ ] Notifications work
- [ ] Document upload works
- [ ] Performance acceptable
- [ ] Security checks passed

## Sign-off

- Tested by: _______________
- Date: _______________
- Status: ✅ Pass / ❌ Fail
- Notes: _______________

---

**Ready for Production**: ✅ / ❌
