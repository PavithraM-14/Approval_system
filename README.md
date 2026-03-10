# Document Management & Workflow System

A comprehensive document management system with workflow automation, role-based access control, and enterprise integrations.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 4.4+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Seed the database
npm run clear-db
npm run seed

# Start development server
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 📁 Project Structure

```
├── app/                    # Next.js app directory (pages & API routes)
│   ├── api/               # API endpoints
│   ├── dashboard/         # Dashboard pages
│   ├── login/            # Authentication pages
│   └── signup/           # Registration pages
├── components/            # React components
│   └── workflow-nodes/   # Workflow node components
├── lib/                   # Utility functions & services
├── models/                # MongoDB/Mongoose models
├── scripts/               # Database & maintenance scripts
├── public/                # Static assets
├── docs/                  # Documentation
│   ├── api/              # API documentation
│   ├── archive/          # Historical docs
│   ├── features/         # Feature documentation
│   └── setup-guides/     # Setup instructions
└── __tests__/            # Test files

```

## 🎯 Key Features

### Core Features
- **Document Management** - Upload, version control, and organize documents
- **Workflow Builder** - Visual workflow designer with drag-and-drop interface
- **Role-Based Access Control** - Granular permissions system
- **Approval Workflows** - Multi-stage approval processes
- **Real-time Notifications** - Email and in-app notifications
- **Audit Trail** - Complete activity logging

### Enterprise Features
- **Gmail Integration** - Send documents via Gmail
- **Google Drive Integration** - Sync with Google Drive
- **ERP/CRM Integration** - Connect with Odoo, SuiteCRM
- **HR Integration** - OrangeHRM integration
- **Document Watermarking** - Automatic watermark application
- **External Sharing** - Secure document sharing links
- **Retention Policies** - Automated document lifecycle management

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/your-database

# Authentication
JWT_SECRET=your-secret-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# ConvertAPI (Optional - for document conversion)
CONVERTAPI_SECRET=your-convertapi-secret

# Integrations (Optional)
ODOO_URL=https://your-odoo-instance.com
ODOO_DB=your-database
ODOO_USERNAME=admin
ODOO_PASSWORD=your-password

SUITECRM_URL=https://your-suitecrm-instance.com
SUITECRM_USERNAME=admin
SUITECRM_PASSWORD=your-password

ORANGEHRM_URL=https://your-orangehrm-instance.com
ORANGEHRM_CLIENT_ID=your-client-id
ORANGEHRM_CLIENT_SECRET=your-client-secret
```

## 📚 Documentation

- [API Documentation](docs/api/) - REST API endpoints
- [Setup Guides](docs/setup-guides/) - Detailed setup instructions
- [Feature Guides](docs/features/) - Feature-specific documentation
- [Workflow System](components/WorkflowBuilder.README.md) - Workflow builder guide

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- __tests__/api/

# Run with coverage
npm test -- --coverage
```

## 📦 Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run clear-db         # Clear all database collections
npm run seed             # Seed database with sample data
npm run seed:admin       # Seed admin user only

# Maintenance
npm run backup           # Create database backup
npm run apply-retention  # Apply retention policies
npm run send-reminders   # Send reminder emails
npm run process-renewals # Process renewal requests
```

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14, React 18, TailwindCSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, NextAuth.js
- **File Storage**: Local filesystem (configurable)
- **Email**: Nodemailer
- **Workflow Engine**: Custom workflow execution engine

### Key Design Patterns
- **Repository Pattern** - Data access abstraction
- **Service Layer** - Business logic separation
- **Middleware Pattern** - Request processing pipeline
- **Observer Pattern** - Event-driven notifications

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- Company-level data isolation
- Secure file upload validation
- XSS protection
- CSRF protection
- SQL injection prevention (NoSQL)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Support

For support, email support@example.com or open an issue in the repository.

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] AI-powered document classification
- [ ] Blockchain-based audit trail
- [ ] Multi-language support
- [ ] Advanced workflow templates

---

Built with ❤️ using Next.js and MongoDB
