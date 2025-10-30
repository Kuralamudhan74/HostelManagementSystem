# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ PHASE 1 STATUS - TENANT LOGIN DISABLED

**Current Phase**: Phase 1 - Admin-Only Management
**Status**: Tenant login and dashboard features have been **completely removed**

### What's Changed in Phase 1:
- ❌ **Tenant login is disabled** - Tenants cannot log in to the system
- ❌ **Tenant dashboard removed** - No self-service tenant portal
- ✅ **Admin manages everything** - All tenant data managed by admin
- ✅ **CSV Import feature added** - Bulk tenant import from Google Forms
- ✅ **Auto-generated credentials** - Emails and passwords generated automatically
- ✅ **Duplicate prevention** - Skips users with same phone/Aadhar

### Tenant Data Import Process:
1. Tenants fill out Google Form with personal details
2. Admin exports form responses as CSV
3. Admin uploads CSV via "Import CSV" button in Tenants page
4. System validates and creates tenant accounts
5. Admin receives list of generated passwords to share with tenants

### What's Preserved (for Phase 2):
- All database models intact
- Admin tenant management features fully functional
- Authentication infrastructure ready
- Easy restoration path (2-3 hours to re-enable tenant features)

## Development Commands

### Root Level Commands
```bash
# Development (starts both backend & frontend concurrently)
npm run dev

# Individual services
npm run dev:backend    # Backend on http://localhost:5000
npm run dev:frontend   # Frontend on http://localhost:5173

# Production build
npm run build          # Builds both applications
npm run start          # Starts production backend

# Database operations
npm run seed           # Seed test data (run from backend directory)
```

### Backend Commands (from backend/)
```bash
npm run dev            # Start with nodemon (auto-reload on changes)
npm run build          # TypeScript compilation to dist/
npm run start          # Run compiled production build
npm test               # Run Jest tests
npm run seed           # Seed database with demo data
npm run generate-rent  # Manually generate monthly rents (also runs via cron)
```

### Frontend Commands (from frontend/)
```bash
npm run dev            # Start Vite dev server with HMR
npm run build          # Production build
npm run preview        # Preview production build locally
npm run lint           # Run ESLint
```

### Docker
```bash
docker-compose up -d   # Start all services (MongoDB, Backend, Frontend)
docker-compose logs -f # View real-time logs
docker-compose down    # Stop all services
```

## Architecture Overview

### Technology Stack
- **Backend**: Express.js + TypeScript + MongoDB (Mongoose ODM)
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Authentication**: JWT with refresh tokens (15min access, 7d refresh)
- **Validation**: Zod for runtime validation + TypeScript for compile-time
- **State Management**: TanStack React Query (server state) + Context API (auth)
- **File Storage**: Dual strategy (local filesystem + MongoDB GridFS)

### Monorepo Structure
```
root/
├── backend/src/
│   ├── app.ts                    # Express setup, middleware, DB connection
│   ├── controllers/              # Route handlers (admin, auth, tenant, attachment)
│   ├── middleware/               # auth.ts (JWT), validation.ts (Zod)
│   ├── models/index.ts          # ALL 14+ Mongoose schemas in ONE file
│   ├── routes/index.ts          # All API route definitions
│   ├── scripts/                 # seed.ts, generateRent.ts (cron job)
│   └── utils/                   # paymentUtils.ts, auditLogger.ts
├── frontend/src/
│   ├── App.tsx                  # Route configuration, protected routes
│   ├── components/              # Reusable UI components
│   ├── contexts/AuthContext.tsx # Auth state management
│   ├── pages/                   # admin/ and tenant/ page components
│   ├── services/api.ts          # Axios client with 336 lines of API methods
│   └── types/index.ts           # All TypeScript interfaces (254 lines)
└── docker-compose.yml           # Multi-container orchestration
```

## Core System Components

### 1. Multi-Hostel Management Hierarchy
The system manages a four-level hierarchy:
- **Owner** → **Hostel** → **Room** → **Tenancy**
- Rooms support multiple concurrent tenants (shared accommodation)
- Room capacity tracking with automatic validation
- Tenancy uses `isActive` flag for soft deletes

### 2. Smart Payment Allocation System
**Location**: `backend/src/utils/paymentUtils.ts` (214 lines)

The payment system is the most complex part of the codebase:
- **Automatic allocation suggestions**: Allocates to oldest dues first
- **Partial payment support**: Tracks `due`, `partial`, `paid` statuses
- **EB bill splitting**: Electricity bills automatically split among roommates
- **Cross-due allocation**: Single payment can cover multiple rents/bills
- **PaymentAllocation model**: Junction table linking payments to specific dues

**Key Functions**:
- `suggestPaymentAllocation()`: Generates smart allocation suggestions
- `calculateTotalDues()`: Aggregates all unpaid amounts for a tenant
- `getTenantDues()`: Returns detailed breakdown of all outstanding dues

### 3. Automated Monthly Rent Generation
**Script**: `backend/src/scripts/generateRent.ts`

- Runs via node-cron (configured in app.ts if enabled)
- Creates MonthlyRent records for all active tenancies
- Due date: 5th of each month
- Period format: "YYYY-MM"
- Duplicate prevention via period checking

### 4. Comprehensive Audit Logging
**Location**: `backend/src/utils/auditLogger.ts`

Every financial and tenancy change is logged with:
- Actor (userId), action type, table name, record ID
- Before/after data snapshots (JSON)
- Timestamp for compliance and debugging

### 5. Dual File Storage Strategy
**Controller**: `backend/src/controllers/attachmentController.ts`

- **Local**: Files saved to `backend/uploads/` directory
- **GridFS**: Files stored in MongoDB as chunks (for scalability)
- Attachment model tracks metadata: filename, size, mimetype, storage type
- Links to payments/expenses via foreign keys

## Important Code Patterns

### All Models in Single File
**`backend/src/models/index.ts`** contains 14+ Mongoose schemas (425 lines):
- User, Owner, Hostel, Room, Tenancy
- MonthlyRent, Bill, Payment, PaymentAllocation, RoomEBBill
- ExpenseCategory, Expense, InventoryItem, RoomInventory
- AuditLog, Attachment

This is intentional for easier cross-model relationship management.

### Validation Pattern
Zod schemas are co-located with controllers, not in separate files:

```typescript
// In controller file
const createRoomSchema = z.object({
  body: z.object({
    roomNumber: z.string().min(1),
    hostelId: z.string().min(1),
    capacity: z.number().min(1),
    rentAmount: z.number().min(0)
  })
});

// In routes file
router.post('/admin/rooms',
  authenticate,
  requireAdmin,
  validate(createRoomSchema),  // Middleware validates before controller
  createRoom
);
```

### Role-Based API Structure
- **`/api/auth/*`**: Public authentication endpoints
- **`/api/admin/*`**: Admin-only operations (hostels, rooms, tenants, payments, expenses)
- **`/api/me/*`**: Tenant-specific endpoints (dues, tenancy, payments, dashboard)

All admin routes use `authenticate` + `requireAdmin` middleware.

### Frontend API Client Pattern
**`frontend/src/services/api.ts`** (336 lines) contains:
- Axios interceptor for automatic token refresh on 401
- All API methods as named functions (not generic REST wrapper)
- Error handling with token refresh retry logic
- Type-safe request/response interfaces

### Soft Delete Convention
Never hard-delete records. Use `isActive: boolean` flags:
- Tenancy, ExpenseCategory, InventoryItem all use this pattern
- Queries filter by `isActive: true` by default
- Preserves data integrity and audit trail

### Status Tracking Pattern
Explicit status enums for state management:
- **MonthlyRent**: `due`, `partial`, `paid`
- **Bill**: `due`, `partial`, `paid`
- **Payment**: Always paid (it's a received payment)
- **Tenancy**: Uses `isActive` boolean instead

## Environment Configuration

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hostel-management
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
UPLOADS_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
CORS_ORIGIN=http://localhost:5173
```

### Frontend
Vite proxy configured in `vite.config.ts` forwards `/api/*` requests to `http://localhost:5000`.

## Demo Credentials
After running `npm run seed` from backend directory:
- **Admin**: `admin@hostel.com` / `admin123`
- ~~**Tenant**: `tenant1@hostel.com` / `tenant123`~~ (Tenant login disabled in Phase 1)

## CSV Tenant Import (Phase 1 Feature)

### Import Workflow
1. **Google Form Setup**: Collect tenant data with these fields:
   - Name, Father Name, Date of Birth
   - Mobile Number, WhatsApp Number
   - Permanent Address (native), City & State
   - Aadhar Number, Occupation
   - Name of College/Company/Institute
   - Emergency Contact with Name (format: "Name - Phone")
   - Optional: Expected Duration of Stay, Office Address

2. **Export & Upload**:
   - Export form responses as CSV from Google Sheets
   - Admin navigates to Tenants page → Click "Import CSV"
   - Upload CSV file (max 5MB)

3. **Processing**:
   - System validates all required fields
   - Checks for duplicates (phone or Aadhar number)
   - Auto-generates email addresses (format: `name.timestamp@tenant.hostel.com`)
   - Auto-generates passwords (format: `name123` - random suffix)
   - Creates User records with role='tenant'

4. **Results**:
   - Shows success/failure counts
   - Displays generated passwords for admin to share
   - Lists any errors with specific reasons

### Key Files for CSV Import:
- **`backend/src/controllers/importController.ts`** - CSV parsing, validation, user creation
- **`backend/src/routes/index.ts`** - Route: `POST /api/admin/tenants/import-csv`
- **`frontend/src/pages/admin/TenantsPage.tsx`** - Import UI with modals
- **`sample-tenant-import.csv`** - Example CSV format

### Important Notes:
- Duplicate detection: Same phone OR Aadhar = skip import
- Email is auto-generated (tenants don't provide it in form)
- Passwords are shown only once in import results modal
- State parsing: "Chennai TN" → city="Chennai", state="TN"
- Emergency contact parsing: "Name - Phone" → separate fields

## Key Files to Understand First

1. **`backend/src/models/index.ts`** (425 lines) - All database schemas and relationships
2. **`backend/src/utils/paymentUtils.ts`** (214 lines) - Complex payment allocation logic
3. **`backend/src/controllers/importController.ts`** (300+ lines) - CSV tenant import logic
4. **`frontend/src/services/api.ts`** (336 lines) - All API methods and auth interceptors
5. **`backend/src/routes/index.ts`** (134 lines) - Complete API surface area
6. **`frontend/src/types/index.ts`** (254 lines) - All TypeScript interfaces

## Database Design Notes

### Key Relationships
- Mongoose ObjectId references with `.populate()` for joins
- No foreign key constraints (MongoDB doesn't enforce them)
- Relationship integrity maintained at application level

### Room Sharing Logic
Rooms can have multiple concurrent tenants:
```typescript
Room.capacity = 3        // Max tenants
Tenancy records: 2       // Current occupancy
Available spots: 1       // Calculated in UI
```

Each tenant in a shared room pays their individual rent (not split), but EB bills ARE split equally among roommates.

## Testing Notes

### Backend Testing
- Jest configured but test files may be minimal
- Test with Postman/Thunder Client using API_TESTING_GUIDE.md
- Seed data provides realistic test scenarios

### Frontend Testing
- Vitest configured (Vite's test runner)
- React Testing Library available
- Test coverage may be limited

## Common Development Workflows

### Adding a New Feature
1. Add Mongoose schema to `backend/src/models/index.ts`
2. Create controller in `backend/src/controllers/` with Zod schemas
3. Add routes to `backend/src/routes/index.ts` with validation middleware
4. Add TypeScript types to `frontend/src/types/index.ts`
5. Add API methods to `frontend/src/services/api.ts`
6. Create/update page components in `frontend/src/pages/`

### Debugging Payment Issues
1. Check `backend/src/utils/paymentUtils.ts` for allocation logic
2. Verify PaymentAllocation records in MongoDB
3. Check MonthlyRent and Bill `status` and `amountPaid` fields
4. Review AuditLog collection for change history

### Database Schema Changes
1. Update interface in `backend/src/models/index.ts`
2. Update Mongoose schema in same file
3. Consider migration script if needed (no migration framework currently)
4. Update TypeScript types in `frontend/src/types/index.ts`
5. Update API methods and UI accordingly

## Architecture Decisions to Understand

### Why All Models in One File?
Easier to see relationships and avoid circular dependencies. With 14+ models, cross-references are common (e.g., Payment references MonthlyRent, Bill, Tenancy).

### Why Dual File Storage?
- Local filesystem for development simplicity
- GridFS for production scalability and distributed deployments
- Attachment model abstracts storage location

### Why Co-located Zod Schemas?
Keeps validation logic close to business logic. When controller logic changes, validation schema is right there to update.

### Why React Query + Context?
- React Query for server state (caching, refetching, optimistic updates)
- Context API for client state (current user, auth status)
- Separation of concerns without Redux complexity

### Why Manual Token Refresh?
Axios interceptor automatically retries failed requests after refreshing token. User never sees auth errors unless refresh token is expired.
