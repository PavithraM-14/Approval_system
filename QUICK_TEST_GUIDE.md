# Quick Test Guide - 5 Minute Verification

## Prerequisites
```bash
# Make sure you're in the project directory
cd approval_system

# Install dependencies (if not already done)
npm install
```

## Test 1: Build (1 minute)
```bash
npm run build
```
✅ **Expected**: Build completes without errors
❌ **If fails**: Check error messages, ensure all dependencies installed

## Test 2: Start Dev Server (1 minute)
```bash
npm run dev
```
✅ **Expected**: Server starts on http://localhost:3000
❌ **If fails**: Check port 3000 is not in use, check .env.local exists

## Test 3: Visual Check (2 minutes)

### Step 1: Open Browser
Navigate to: http://localhost:3000

### Step 2: Check Login Page
- ✅ Page loads
- ✅ No "SRM" text visible
- ✅ Form works

### Step 3: Login
Use test credentials:
- Email: `requester@company.com`
- Password: `password123`

### Step 4: Check Dashboard
- ✅ Sidebar shows "Approval System" (not "SRM-RMP")
- ✅ Header shows "Approval System" (not "SRM-RMP Approval System")
- ✅ No "SRM" anywhere on page

### Step 5: Check Navigation
Click through:
- ✅ My Requests - loads correctly
- ✅ Create Request - loads correctly
- ✅ Documents - loads correctly
- ✅ Notification bell - opens dropdown

## Test 4: Search Feature (1 minute)

### Step 1: Go to My Requests
Click "My Requests" in sidebar

### Step 2: Use Search
- Click search bar
- Type any text
- Click "Search" or press Enter
- ✅ Search works
- ✅ Filters button works

## Test 5: Notifications (30 seconds)

### Step 1: Check Notification Bell
- Click bell icon in header
- ✅ Dropdown opens
- ✅ Shows notifications or "No notifications"
- ✅ No "SRM" text visible

## Quick Pass/Fail

### ✅ PASS if:
- Build completes
- Server starts
- Login works
- Dashboard shows "Approval System"
- No "SRM" visible anywhere
- Search works
- Notifications work

### ❌ FAIL if:
- Build errors
- Server won't start
- "SRM" still visible
- Features broken
- Console errors

## Common Issues & Fixes

### Issue: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Port 3000 already in use"
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port:
PORT=3001 npm run dev
```

### Issue: ".env.local not found"
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### Issue: "Cannot connect to database"
```bash
# Check MONGODB_URI in .env.local
# Verify MongoDB is running/accessible
```

## Full Test (If Time Permits)

### Test Create Request
1. Click "Create Request"
2. Fill form:
   - Title: "Test Request"
   - Purpose: "Testing"
   - College: "Engineering"
   - Department: "IT"
   - Cost: 10000
   - Category: "Equipment"
3. Submit
4. ✅ Request created
5. ✅ Appears in "My Requests"

### Test Document Upload
1. Click "Documents"
2. Click "Upload Document"
3. Select a file
4. Fill metadata
5. Upload
6. ✅ Document appears in list

### Test Notifications
1. Create a request
2. Check notification bell
3. ✅ New notification appears
4. Click notification
5. ✅ Navigates to request

## Final Checklist

- [ ] Build successful
- [ ] Server starts
- [ ] Login works
- [ ] Dashboard shows "Approval System"
- [ ] No "SRM" visible
- [ ] Search works
- [ ] Notifications work
- [ ] Create request works
- [ ] Documents page works
- [ ] No console errors

## Sign Off

**Tested By**: _______________
**Date**: _______________
**Time Taken**: _____ minutes
**Result**: ✅ PASS / ❌ FAIL

**Notes**:
_________________________________
_________________________________
_________________________________

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Commit changes to git
2. Push to repository
3. Deploy to staging/production
4. Notify team

### If Any Test Fails ❌
1. Note which test failed
2. Check error messages
3. Review `CHANGES_SUMMARY.md`
4. Fix issues
5. Re-test

---

**Need Help?**
- Review `test-changes.md` for detailed testing
- Check `CHANGES_SUMMARY.md` for what changed
- See `REBRANDING_COMPLETE.md` for overview
