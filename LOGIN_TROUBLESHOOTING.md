# 🔐 Login Troubleshooting Guide

## ❌ Error: 401 Unauthorized / 403 Forbidden

You're seeing these errors because you're not logged in or your session expired.

---

## ✅ Quick Fix (3 Steps)

### Step 1: Clear Browser Data

**Option A - Clear Cookies (Recommended):**
1. Press `F12` to open DevTools
2. Go to **Application** tab
3. Click **Cookies** → `http://localhost:3000`
4. Right-click → **Clear**
5. Close DevTools
6. Refresh page (`Ctrl+R`)

**Option B - Use Incognito Mode:**
1. Open new incognito/private window (`Ctrl+Shift+N`)
2. Go to `http://localhost:3000`

### Step 2: Make Sure MongoDB is Running

```bash
# Check if MongoDB is running
mongod --version

# If you see an error, start MongoDB:
mongod --dbpath C:\data\db
```

### Step 3: Log In

1. Go to: `http://localhost:3000/login`
2. Use test credentials:

**For Requester:**
- Email: `requester@test.com`
- Password: `password`

**For VP (to see approvals):**
- Email: `vp@test.com`
- Password: `password`

**For Admin:**
- Email: `admin@test.com`
- Password: `password`

---

## 🔍 If Still Not Working

### Check 1: Is MongoDB Running?

```bash
# Windows - Check if MongoDB service is running
Get-Service -Name MongoDB

# Or check if mongod process is running
Get-Process mongod
```

If not running:
```bash
# Start MongoDB
mongod --dbpath C:\data\db
```

### Check 2: Is Next.js Running?

```bash
# Check if dev server is running on port 3000
netstat -ano | findstr :3000
```

If not running:
```bash
# Start Next.js
npm run dev
```

### Check 3: Do Test Users Exist?

Run the seed script to create test users:

```bash
npm run seed
```

This creates:
- `requester@test.com` / `password`
- `manager@test.com` / `password`
- `vp@test.com` / `password`
- `dean@test.com` / `password`
- `chairman@test.com` / `password`

---

## 🎯 Common Issues & Solutions

### Issue 1: "Cannot connect to MongoDB"

**Solution:**
```bash
# Make sure MongoDB is installed
mongod --version

# Start MongoDB with correct data path
mongod --dbpath C:\data\db
```

### Issue 2: "Invalid credentials"

**Solution:**
1. Run seed script: `npm run seed`
2. Use exact credentials: `requester@test.com` / `password`
3. Check for typos (no spaces!)

### Issue 3: "Session expired"

**Solution:**
1. Clear cookies (see Step 1 above)
2. Log in again
3. Session lasts 7 days

### Issue 4: "403 Forbidden on requests"

**Solution:**
- You're logged in but don't have permission
- Make sure you're using the right role
- Requester can only see their own requests
- VP/Manager can see requests needing approval

---

## 🚀 Fresh Start (Nuclear Option)

If nothing works, do a complete reset:

### 1. Stop Everything
```bash
# Stop Next.js (Ctrl+C in terminal)
# Stop MongoDB (Ctrl+C in MongoDB terminal)
```

### 2. Clear Browser Completely
- Close all browser windows
- Open new incognito window

### 3. Restart MongoDB
```bash
mongod --dbpath C:\data\db
```

### 4. Restart Next.js
```bash
npm run dev
```

### 5. Seed Database
```bash
npm run seed
```

### 6. Log In Fresh
- Go to `http://localhost:3000/login`
- Use `requester@test.com` / `password`

---

## 📝 Test Login Flow

### 1. Open Browser DevTools (F12)
### 2. Go to Network Tab
### 3. Try to Log In
### 4. Check the Response

**If login succeeds:**
- You'll see `200 OK` response
- Cookie will be set
- You'll be redirected to dashboard

**If login fails:**
- Check the error message
- Verify MongoDB is running
- Verify credentials are correct

---

## 🎬 For Demo/Hackathon

### Quick Login for Demo:

1. **Before Demo:**
   - Clear cookies
   - Close all browser tabs
   - Restart browser

2. **During Demo:**
   - Open fresh browser window
   - Go to `http://localhost:3000/login`
   - Log in as `vp@test.com` / `password`
   - Show features

3. **If Login Fails During Demo:**
   - Use incognito mode
   - Or use the integration demo page: `/dashboard/integration-demo`
   - This page doesn't require login!

---

## 🆘 Emergency Demo Backup

If login completely breaks during demo:

### Option 1: Use Integration Demo Page
```
http://localhost:3000/dashboard/integration-demo
```
This page works WITHOUT login!

### Option 2: Show the Code
- Open VS Code
- Show the integration files
- Explain the architecture
- Judges will understand

### Option 3: Use Screenshots
- Take screenshots beforehand
- Show them during demo
- Explain what each screen does

---

## ✅ Verification Checklist

Before demo, verify:

- [ ] MongoDB is running
- [ ] Next.js is running (`npm run dev`)
- [ ] Can access login page
- [ ] Can log in successfully
- [ ] Can see dashboard
- [ ] Can access integration demo page
- [ ] Have backup screenshots ready

---

## 📞 Quick Commands Reference

```bash
# Check MongoDB
mongod --version
Get-Process mongod

# Start MongoDB
mongod --dbpath C:\data\db

# Check Next.js
netstat -ano | findstr :3000

# Start Next.js
npm run dev

# Seed database
npm run seed

# Clear npm cache (if needed)
npm cache clean --force
```

---

## 🎯 Most Common Solution

**90% of the time, this fixes it:**

1. Clear cookies (F12 → Application → Cookies → Clear)
2. Refresh page
3. Log in again

**That's it!** 🎉

---

## 💡 Pro Tip

For hackathon demo, have TWO browser windows ready:
1. **Main window** - Logged in and ready
2. **Backup incognito window** - Fresh login available

If main window has issues, switch to backup!

---

## 🆘 Still Stuck?

Check these files for errors:

1. **Browser Console** (F12 → Console)
   - Look for red errors
   - Check what's failing

2. **Next.js Terminal**
   - Look for error messages
   - Check if server crashed

3. **MongoDB Terminal**
   - Make sure it's running
   - No error messages

---

**Remember:** The integration demo page (`/dashboard/integration-demo`) works WITHOUT login, so you always have a backup for your demo! 🚀
