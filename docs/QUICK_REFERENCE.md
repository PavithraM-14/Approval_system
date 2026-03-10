# Quick Reference Guide

## Common Commands

### Development
```bash
npm run dev              # Start development server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Check code quality
npm test                 # Run tests
```

### Database
```bash
npm run clear-db         # Clear all collections
npm run seed             # Seed sample data
npm run seed:admin       # Create admin user only
npm run backup           # Create database backup
```

### Maintenance
```bash
npm run send-reminders   # Send reminder emails
npm run process-renewals # Process renewal requests
npm run apply-retention  # Apply retention policies
```

## Default Login Credentials

After running `npm run seed`:

**System Admin:**
- Email: `admin@example.com`
- Password: `admin123`

## API Endpoints Quick Reference

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP

### Requests
- `GET /api/requests` - List all requests
- `POST /api/requests` - Create new request
- `GET /api/requests/:id` - Get request details
- `PUT /api/requests/:id` - Update request
- `POST /api/requests/:id/approve` - Approve request

### Workflows
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/:id` - Get workflow
- `PUT /api/workflows/:id` - Update workflow
- `POST /api/workflows/:id/activate` - Activate workflow

### Roles
- `GET /api/roles` - List roles (company-specific)
- `POST /api/roles` - Create role
- `GET /api/roles/:id` - Get role details
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `GET /api/roles/:id/users` - Get users with role

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id` - Get document
- `DELETE /api/documents/:id` - Delete document

## Environment Variables

### Required
```env
MONGODB_URI=mongodb://localhost:27017/your-db
JWT_SECRET=your-secret-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Email (Required for notifications)
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Optional Integrations
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# ConvertAPI
CONVERTAPI_SECRET=your-secret

# Odoo ERP
ODOO_URL=https://your-odoo.com
ODOO_DB=your-db
ODOO_USERNAME=admin
ODOO_PASSWORD=password

# SuiteCRM
SUITECRM_URL=https://your-suitecrm.com
SUITECRM_USERNAME=admin
SUITECRM_PASSWORD=password

# OrangeHRM
ORANGEHRM_URL=https://your-orangehrm.com
ORANGEHRM_CLIENT_ID=your-client-id
ORANGEHRM_CLIENT_SECRET=your-client-secret
```

## File Structure Quick Reference

```
├── app/
│   ├── api/              # API routes
│   └── dashboard/        # Dashboard pages
├── components/           # React components
├── lib/                  # Business logic & utilities
├── models/               # Database models
├── scripts/              # Maintenance scripts
├── public/               # Static files
├── docs/                 # Documentation
└── __tests__/           # Test files
```

## Common Issues & Solutions

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB
mongod

# Or check connection string in .env.local
```

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npx tsc --noEmit
```

### Authentication Issues
```bash
# Clear browser cookies and localStorage
# Check JWT_SECRET in .env.local
# Verify user exists in database
```

## Database Collections

- `users` - User accounts
- `companies` - Organizations
- `roles` - Role definitions
- `requests` - Document requests
- `documents` - Document metadata
- `files` - File metadata
- `workflowconfigurations` - Workflow definitions
- `executionstates` - Workflow execution state
- `notifications` - User notifications
- `auditlogs` - Audit trail
- `sharelinks` - External sharing links
- `retentionpolicies` - Data retention rules

## Useful MongoDB Queries

```javascript
// Find all users
db.users.find()

// Find user by email
db.users.findOne({ email: "admin@example.com" })

// Count requests
db.requests.countDocuments()

// Find requests by status
db.requests.find({ status: "pending" })

// Find workflows for company
db.workflowconfigurations.find({ companyId: ObjectId("...") })

// Clear all requests
db.requests.deleteMany({})
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push to remote
git push origin feature/your-feature

# Create pull request on GitHub
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/api/auth.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Debugging

### Server-Side
- Check terminal console
- Add `console.log()` in API routes
- Check MongoDB logs

### Client-Side
- Open DevTools (F12)
- Check Console tab
- Use React DevTools
- Check Network tab for API calls

## Performance Tips

- Use React.memo for expensive components
- Implement pagination for large lists
- Add database indexes
- Use image optimization
- Implement caching

## Security Checklist

- [ ] Environment variables not committed
- [ ] JWT secret is strong
- [ ] Input validation on all endpoints
- [ ] Authentication on protected routes
- [ ] File upload validation
- [ ] XSS protection enabled
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented

## Deployment Checklist

- [ ] All tests passing
- [ ] Build succeeds
- [ ] Environment variables set
- [ ] Database backed up
- [ ] SSL certificate configured
- [ ] Monitoring enabled
- [ ] Error tracking set up
- [ ] Performance optimized

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Email: support@example.com

## Keyboard Shortcuts

### Workflow Builder
- `Ctrl+Z` - Undo
- `Ctrl+Shift+Z` - Redo
- `Delete` - Delete selected node
- `Ctrl+S` - Save workflow (if implemented)

### General
- `F12` - Open DevTools
- `Ctrl+Shift+R` - Hard refresh
- `Ctrl+K` - Search (if implemented)

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [MongoDB Docs](https://docs.mongodb.com)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
