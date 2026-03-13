import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import mongoose from 'mongoose';
import connectDB from '../lib/mongodb';
import Request from '../models/Request';
import User from '../models/User';
import CustomRole from '../models/CustomRole';
import UserRoleAssignment from '../models/UserRoleAssignment';
import Company from '../models/Company';
import { RequestStatus, ActionType } from '../lib/types';

// Helper to generate random dates
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to generate random request ID
function generateRequestId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function seedAnalytics() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      process.exit(1);
    }
    
    await connectDB();
    
    console.log('📊 Starting analytics data seed...');

    // Get existing company and users
    const company = await Company.findOne();
    if (!company) {
      console.error('❌ No company found. Please run npm run seed first.');
      process.exit(1);
    }

    const adminUser = await User.findOne({ email: 'admin@dmas.com' });
    if (!adminUser) {
      console.error('❌ Admin user not found. Please run npm run seed first.');
      process.exit(1);
    }

    // Create additional users for realistic analytics
    console.log('👥 Creating additional users for analytics...');
    
    // Get or create roles
    const requesterRole = await CustomRole.findOne({ name: 'Requester', companyId: company._id });
    const approverRole = await CustomRole.findOne({ name: 'Approver', companyId: company._id });
    
    if (!requesterRole || !approverRole) {
      console.error('❌ Required roles not found. Please run npm run seed first.');
      process.exit(1);
    }

    // Create requesters
    const requesters = [];
    const requesterNames = [
      { name: 'John Smith', empId: 'EMP001', dept: 'IT' },
      { name: 'Sarah Johnson', empId: 'EMP002', dept: 'HR' },
      { name: 'Michael Brown', empId: 'EMP003', dept: 'Finance' },
      { name: 'Emily Davis', empId: 'EMP004', dept: 'IT' },
      { name: 'David Wilson', empId: 'EMP005', dept: 'Operations' }
    ];

    for (const req of requesterNames) {
      let user = await User.findOne({ empId: req.empId });
      if (!user) {
        user = await User.create({
          email: `${req.empId.toLowerCase()}@dmas.com`,
          name: req.name,
          empId: req.empId,
          contactNo: `+91 ${Math.floor(9000000000 + Math.random() * 1000000000)}`,
          password: 'password123',
          role: requesterRole._id,
          company: company._id,
          department: req.dept,
          isVerified: true,
          isActive: true
        });

        await UserRoleAssignment.create({
          userId: user._id,
          roleId: requesterRole._id,
          companyId: company._id
        });
      }
      requesters.push(user);
    }

    // Create approvers/forwarders
    const approvers = [];
    const approverNames = [
      { name: 'Robert Taylor', empId: 'MGR001', dept: 'IT' },
      { name: 'Jennifer Martinez', empId: 'MGR002', dept: 'HR' },
      { name: 'William Anderson', empId: 'MGR003', dept: 'Finance' },
      { name: 'Lisa Thomas', empId: 'MGR004', dept: 'Operations' }
    ];

    for (const app of approverNames) {
      let user = await User.findOne({ empId: app.empId });
      if (!user) {
        user = await User.create({
          email: `${app.empId.toLowerCase()}@dmas.com`,
          name: app.name,
          empId: app.empId,
          contactNo: `+91 ${Math.floor(9000000000 + Math.random() * 1000000000)}`,
          password: 'password123',
          role: approverRole._id,
          company: company._id,
          department: app.dept,
          isVerified: true,
          isActive: true
        });

        await UserRoleAssignment.create({
          userId: user._id,
          roleId: approverRole._id,
          companyId: company._id
        });
      }
      approvers.push(user);
    }

    console.log('📝 Creating dummy requests for analytics...');

    // Clear existing requests
    await Request.deleteMany({});

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const requestTypes = ['Budget Approval', 'Purchase Order', 'Contract Review', 'Policy Update', 'Equipment Request'];
    const expenseCategories = ['IT Equipment', 'Office Supplies', 'Software License', 'Training', 'Consulting'];
    const departments = ['IT', 'HR', 'Finance', 'Operations'];

    const statuses = [
      RequestStatus.SUBMITTED,
      RequestStatus.MANAGER_REVIEW,
      RequestStatus.BUDGET_CHECK,
      RequestStatus.VP_APPROVAL,
      RequestStatus.APPROVED,
      RequestStatus.REJECTED
    ];

    const requests = [];

    // Create 50 requests with varied statuses and timelines
    for (let i = 0; i < 50; i++) {
      const requester = requesters[Math.floor(Math.random() * requesters.length)];
      const approver = approvers[Math.floor(Math.random() * approvers.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      // Determine creation date based on distribution
      let createdAt: Date;
      if (i < 20) {
        // 40% in last 30 days
        createdAt = randomDate(thirtyDaysAgo, now);
      } else if (i < 35) {
        // 30% between 30-60 days
        createdAt = randomDate(sixtyDaysAgo, thirtyDaysAgo);
      } else {
        // 30% between 60-90 days
        createdAt = randomDate(ninetyDaysAgo, sixtyDaysAgo);
      }

      const isCompleted = status === RequestStatus.APPROVED || status === RequestStatus.REJECTED;
      
      // Calculate updated date
      let updatedAt: Date;
      if (isCompleted) {
        // Completed requests: 1-10 days after creation
        const completionDays = Math.floor(Math.random() * 10) + 1;
        updatedAt = new Date(createdAt.getTime() + completionDays * 24 * 60 * 60 * 1000);
      } else {
        // In-progress: last update 1-15 days ago
        const daysSinceUpdate = Math.floor(Math.random() * 15) + 1;
        updatedAt = new Date(now.getTime() - daysSinceUpdate * 24 * 60 * 60 * 1000);
      }

      const costEstimate = Math.floor(Math.random() * 100000) + 5000;
      
      const history = [
        {
          action: ActionType.CREATE,
          actor: requester._id,
          notes: 'Request submitted for approval',
          previousStatus: RequestStatus.SUBMITTED,
          newStatus: RequestStatus.SUBMITTED,
          timestamp: createdAt
        }
      ];

      // Add approval history for non-submitted requests
      if (status !== RequestStatus.SUBMITTED) {
        const reviewDate = new Date(createdAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);
        history.push({
          action: ActionType.FORWARD,
          actor: approver._id,
          notes: 'Forwarded to next level',
          previousStatus: RequestStatus.SUBMITTED,
          newStatus: RequestStatus.MANAGER_REVIEW,
          timestamp: reviewDate
        });
      }

      if (status === RequestStatus.APPROVED) {
        history.push({
          action: ActionType.APPROVE,
          actor: approver._id,
          notes: 'Request approved',
          previousStatus: RequestStatus.MANAGER_REVIEW,
          newStatus: RequestStatus.APPROVED,
          timestamp: updatedAt
        });
      } else if (status === RequestStatus.REJECTED) {
        history.push({
          action: ActionType.REJECT,
          actor: approver._id,
          notes: 'Request rejected due to budget constraints',
          previousStatus: RequestStatus.MANAGER_REVIEW,
          newStatus: RequestStatus.REJECTED,
          timestamp: updatedAt
        });
      }

      const request = {
        requestId: generateRequestId(),
        title: `${requestTypes[Math.floor(Math.random() * requestTypes.length)]} - ${i + 1}`,
        purpose: `Request for ${expenseCategories[Math.floor(Math.random() * expenseCategories.length)]}`,
        department: departments[Math.floor(Math.random() * departments.length)],
        costEstimate,
        expenseCategory: expenseCategories[Math.floor(Math.random() * expenseCategories.length)],
        requestType: 'one-time',
        attachments: ['dummy-document.pdf'],
        requester: requester._id,
        status,
        history,
        createdAt,
        updatedAt,
        budgetAllocated: costEstimate * 1.2,
        budgetSpent: isCompleted ? costEstimate : 0,
        budgetBalance: isCompleted ? costEstimate * 0.2 : costEstimate * 1.2
      };

      requests.push(request);
    }

    // Insert all requests
    await Request.insertMany(requests);

    console.log('✅ Analytics data seeded successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Created ${requesters.length} requesters`);
    console.log(`   - Created ${approvers.length} approvers`);
    console.log(`   - Created ${requests.length} requests`);
    console.log(`\n🎯 Analytics Dashboard is now ready!`);
    console.log(`   Visit: http://localhost:3000/dashboard/analytics`);
    console.log(`   Login as: admin@dmas.com / adminPassword123`);

  } catch (error) {
    console.error('❌ Analytics seed failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  seedAnalytics();
}

export default seedAnalytics;
