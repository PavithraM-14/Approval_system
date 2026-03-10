# Development Guide

## Getting Started

### Initial Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd <project-directory>
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
- MongoDB connection string
- JWT secret
- Email credentials
- API keys (optional)

4. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas (cloud)
```

5. **Seed the database**
```bash
npm run clear-db
npm run seed
```

6. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000`

### Default Credentials

After seeding, you can login with:

**System Admin:**
- Email: `admin@example.com`
- Password: `admin123`

**Regular Users:**
- Check console output from `npm run seed` for user credentials

## Development Workflow

### Creating a New Feature

1. **Create a new branch**
```bash
git checkout -b feature/your-feature-name
```

2. **Develop the feature**
   - Add models if needed (`/models`)
   - Create API routes (`/app/api`)
   - Build UI components (`/components`)
   - Add pages (`/app/dashboard`)
   - Write business logic (`/lib`)

3. **Test your changes**
```bash
npm test
npm run build  # Ensure it builds
```

4. **Commit and push**
```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

5. **Create a pull request**

### Code Style

- Use TypeScript for all new code
- Follow ESLint rules: `npm run lint`
- Use Prettier for formatting
- Write meaningful commit messages (conventional commits)

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(workflow): add parallel split node
fix(auth): resolve login redirect issue
docs(api): update authentication endpoints
```

## Common Development Tasks

### Adding a New API Endpoint

1. Create route file: `app/api/your-endpoint/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Your logic here
    
    return NextResponse.json({ data: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

2. Test the endpoint
3. Document in `/docs/api`

### Adding a New Model

1. Create model file: `models/YourModel.ts`

```typescript
import mongoose from 'mongoose';

export interface IYourModel {
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const yourModelSchema = new mongoose.Schema<IYourModel>({
  name: { type: String, required: true },
  description: { type: String },
}, {
  timestamps: true,
});

export default mongoose.models.YourModel || 
  mongoose.model<IYourModel>('YourModel', yourModelSchema);
```

2. Use in API routes
3. Add to seed script if needed

### Adding a New Component

1. Create component: `components/YourComponent.tsx`

```typescript
'use client';

import { useState } from 'react';

interface YourComponentProps {
  title: string;
  onAction?: () => void;
}

export default function YourComponent({ title, onAction }: YourComponentProps) {
  const [state, setState] = useState('');
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{title}</h2>
      {/* Your JSX */}
    </div>
  );
}
```

2. Import and use in pages
3. Write tests if complex

### Adding a New Page

1. Create page: `app/dashboard/your-page/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function YourPage() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Fetch data
  }, []);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Your Page</h1>
      {/* Your content */}
    </div>
  );
}
```

2. Add to navigation if needed (`app/dashboard/layout.tsx`)

## Database Management

### Clearing Database
```bash
npm run clear-db
```

### Seeding Data
```bash
npm run seed          # Seed all data
npm run seed:admin    # Seed admin only
```

### Creating Backups
```bash
npm run backup
```

### Applying Retention Policies
```bash
npm run apply-retention
```

## Testing

### Running Tests
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
npm test -- api/auth       # Specific test
```

### Writing Tests

Create test file: `__tests__/your-feature.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';

describe('Your Feature', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

## Debugging

### Server-Side Debugging
- Check terminal console for server logs
- Use `console.log()` in API routes
- Check MongoDB logs

### Client-Side Debugging
- Open browser DevTools (F12)
- Check Console tab for errors
- Use React DevTools extension
- Check Network tab for API calls

### Common Issues

**MongoDB Connection Failed**
- Ensure MongoDB is running
- Check connection string in `.env.local`
- Verify network access

**Authentication Issues**
- Clear browser cookies
- Check JWT_SECRET in `.env.local`
- Verify user exists in database

**Build Errors**
- Run `npm run lint` to check for errors
- Check TypeScript errors: `npx tsc --noEmit`
- Clear `.next` folder: `rm -rf .next`

## Performance Optimization

### Frontend
- Use React.memo for expensive components
- Implement lazy loading for large components
- Optimize images (use Next.js Image component)
- Minimize bundle size

### Backend
- Add database indexes for frequently queried fields
- Use pagination for large datasets
- Implement caching where appropriate
- Optimize database queries

### Database
- Create indexes on frequently queried fields
- Use projection to limit returned fields
- Implement aggregation pipelines for complex queries

## Security Best Practices

1. **Never commit sensitive data**
   - Use `.env.local` for secrets
   - Add to `.gitignore`

2. **Validate all inputs**
   - Server-side validation
   - Sanitize user input
   - Use TypeScript types

3. **Implement proper authentication**
   - Use JWT tokens
   - Implement refresh tokens
   - Set secure cookie flags

4. **Protect API routes**
   - Check authentication
   - Verify authorization
   - Rate limiting

5. **Secure file uploads**
   - Validate file types
   - Limit file sizes
   - Scan for malware

## Deployment

### Building for Production
```bash
npm run build
```

### Starting Production Server
```bash
npm start
```

### Environment Variables
Ensure all required environment variables are set in production:
- `MONGODB_URI`
- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- Email configuration
- API keys

### Deployment Checklist
- [ ] All tests passing
- [ ] Build succeeds
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate configured
- [ ] Monitoring set up
- [ ] Backup strategy in place

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm test                 # Run tests

# Database
npm run clear-db         # Clear database
npm run seed             # Seed data
npm run backup           # Create backup

# Maintenance
npm run send-reminders   # Send reminder emails
npm run process-renewals # Process renewals
npm run apply-retention  # Apply retention policies

# Utilities
npx tsc --noEmit        # Check TypeScript errors
npm outdated            # Check outdated packages
npm audit               # Security audit
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [MongoDB Documentation](https://docs.mongodb.com)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Getting Help

- Check existing documentation in `/docs`
- Search closed issues on GitHub
- Ask in team chat
- Create a new issue with detailed description

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
