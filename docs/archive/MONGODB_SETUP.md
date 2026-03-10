# MongoDB Connection Setup

## Status: ✅ Connected Successfully

### Database Information
- **Database Name**: `approval_system`
- **Connection**: MongoDB Atlas (Cloud)
- **Host**: `cluster0.o8mucs9.mongodb.net`

### Connection String
```
mongodb+srv://pavi_1428:****@cluster0.o8mucs9.mongodb.net/approval_system?retryWrites=true&w=majority&appName=Cluster0
```

## Database Contents

### Collections Created
1. **users** - 13 users with different roles
2. **requests** - 25 sample approval requests
3. **budgetrecords** - 60 budget records
4. **soprecords** - 5 SOP (Standard Operating Procedure) records

### Test Users (All passwords: `password123`)

| Email | Name | Role |
|-------|------|------|
| requester@gmail.com | Raj | Requester |
| institution_manager@gmail.com | Tharun | Institution Manager |
| sop_verifier@gmail.com | Akash | SOP Verifier |
| accountant@gmail.com | Swathy | Accountant |
| vp@gmail.com | Shri | Vice President |
| head_of_institution@gmail.com | Priya | Head of Institution |
| dean@gmail.com | Prashanth | Dean |
| mma@gmail.com | Gopinath | MMA |
| hr@gmail.com | Marish | HR |
| audit@gmail.com | Naren | Audit |
| it@gmail.com | Poormila | IT |
| chief_director@gmail.com | Sarvesh | Chief Director |
| chairman@gmail.com | Shivakumar | Chairman |

## Sample Request Scenarios

The database includes 25 diverse request scenarios:

### Approved Requests (3)
- Fully approved requests that went through the complete approval chain

### Rejected Requests (3)
- Rejected at different stages (Manager, VP, Dean)

### In-Progress Requests (4)
- Pending at various approval stages (Manager, Parallel Verification, VP, Dean, Chairman)

### Leave Requests (4)
- Annual leave (pending at VP)
- Medical leave (at HOI)
- Emergency leave (fully approved)
- Maternity leave (pending at VP)

### Clarification Workflow (5)
- Chairman rejected → Dean handling
- Manager rejected → Requester clarifying
- VP rejected → Requester clarified → VP reviewing
- HOI rejected → Requester clarifying
- Chief Director → Dean → Requester → Dean reviewing

### Cost-Based Approval Tests (3)
- ₹30,000 request (pending at Chief Director)
- ₹45,000 request (approved by Chief Director)
- ₹50,000 request (boundary test - approved by Chief Director)

### Budget Not Available Flow (3)
- ₹75,000 request (Manager → Dean → Chairman)
- ₹35,000 request (Manager → Dean → Chairman)
- ₹0 request (Manager → Dean → Chairman)

## Testing the Connection

### Test Connection Script
```bash
npx tsx scripts/test-connection.ts
```

### Reseed Database
```bash
npx tsx scripts/seed.ts
```

## Environment Configuration

The MongoDB connection is configured in:
- `.env.local` (local development)
- `.env.example` (template)

### Required Environment Variables
```env
MONGODB_URI=mongodb+srv://pavi_1428:app1425@cluster0.o8mucs9.mongodb.net/approval_system?retryWrites=true&w=majority&appName=Cluster0
```

## Next Steps

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Login with any test user:
   - Email: `requester@gmail.com`
   - Password: `password123`

3. Explore the approval system features:
   - Create new requests
   - Review pending approvals
   - Search for requests
   - View notifications
   - Access document library

## Troubleshooting

If you encounter connection issues:

1. Check your internet connection
2. Verify MongoDB Atlas IP whitelist settings
3. Confirm credentials in `.env.local`
4. Run the test connection script to diagnose issues

## MongoDB Connection Library

The connection is managed by `lib/mongodb.ts` which:
- Uses connection pooling for efficiency
- Implements caching to reuse connections
- Handles connection errors gracefully
- Provides detailed logging
