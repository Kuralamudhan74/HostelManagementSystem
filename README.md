# Hostel Management System

A comprehensive multi-hostel management web application built with React, TypeScript, Express, and MongoDB. This system provides complete management capabilities for hostel operations including tenant tracking, payment management, room allocation, and financial reporting.

## 🚀 Features

### Core Functionality
- **Multi-hostel Management**: Support for multiple hostels under one owner
- **Room & Tenant Management**: Track rooms with multiple concurrent tenants
- **Payment Tracking**: Manual payment recording with partial payment support
- **Audit Logging**: Complete audit trail for all financial and tenancy changes
- **File Attachments**: Receipt uploads with local storage and MongoDB GridFS
- **Role-based Access**: Admin and tenant roles with appropriate permissions
- **Responsive UI**: Modern interface built with TailwindCSS and Framer Motion

### Advanced Features
- **Partial Payment Allocation**: Smart allocation of payments to multiple dues
- **Monthly Rent Generation**: Automated rent generation with cron jobs
- **Expense Management**: Track hostel expenses with categorization
- **Inventory Management**: Room inventory tracking and condition monitoring
- **Search & Filtering**: Advanced search capabilities with pagination
- **Real-time Updates**: Live data updates with React Query
- **Mobile Responsive**: Optimized for mobile and tablet devices

## 🛠 Tech Stack

### Frontend
- **React 18** + **TypeScript** - Modern React with type safety
- **Vite** - Fast build tool and development server
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **React Query (TanStack Query)** - Server state management
- **React Hook Form** + **Zod** - Form handling and validation
- **Lucide React** - Beautiful icons
- **React Hot Toast** - Toast notifications

### Backend
- **Node.js** + **TypeScript** - Server runtime with type safety
- **Express.js** - Web framework
- **MongoDB** + **Mongoose** - Database and ODM
- **JWT Authentication** - Secure authentication with refresh tokens
- **Multer** - File upload handling
- **node-cron** - Scheduled tasks for rent generation
- **GridFS** - File storage in MongoDB
- **Zod** - Runtime type validation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 5.0+
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd hostel-management-system
   ```

2. **Install dependencies:**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend && npm install
   
   # Install frontend dependencies
   cd ../frontend && npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Copy environment template
   cp backend/env.example backend/.env
   
   # Edit backend/.env with your configuration
   nano backend/.env
   ```

4. **Start MongoDB:**
   ```bash
   # Using MongoDB service
   sudo systemctl start mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   ```

5. **Run the application:**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start individually
   npm run dev:backend  # Backend on port 5000
   npm run dev:frontend # Frontend on port 5173
   ```

6. **Seed test data:**
   ```bash
   npm run seed
   ```

### Demo Credentials
- **Admin**: `admin@hostel.com` / `admin123`
- **Tenant**: `tenant1@hostel.com` / `tenant123`

## 📁 Project Structure

```
hostel-management-system/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   │   ├── authController.ts
│   │   │   ├── adminController.ts
│   │   │   ├── tenantController.ts
│   │   │   └── attachmentController.ts
│   │   ├── middleware/         # Auth, validation middleware
│   │   │   ├── auth.ts
│   │   │   └── validation.ts
│   │   ├── models/             # Mongoose schemas
│   │   │   └── index.ts
│   │   ├── routes/             # API routes
│   │   │   └── index.ts
│   │   ├── utils/              # Helper functions
│   │   │   ├── auditLogger.ts
│   │   │   └── paymentUtils.ts
│   │   ├── scripts/            # Database scripts
│   │   │   ├── seed.ts
│   │   │   └── generateRent.ts
│   │   └── app.ts              # Express app setup
│   ├── uploads/                # Local file storage
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── pages/              # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.tsx
│   │   │   │   ├── RoomsPage.tsx
│   │   │   │   ├── TenantsPage.tsx
│   │   │   │   ├── PaymentsPage.tsx
│   │   │   │   └── ExpensesPage.tsx
│   │   │   ├── tenant/
│   │   │   │   └── TenantDashboard.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── contexts/           # React contexts
│   │   │   └── AuthContext.tsx
│   │   ├── services/           # API client
│   │   │   └── api.ts
│   │   ├── types/              # TypeScript types
│   │   │   └── index.ts
│   │   ├── utils/              # Helper functions
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docker-compose.yml
├── package.json
└── README.md
```

## 📚 API Documentation

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/refresh` | Refresh JWT token | No |
| POST | `/api/auth/logout` | User logout | Yes |
| GET | `/api/me` | Get user profile | Yes |
| PATCH | `/api/me` | Update user profile | Yes |

### Admin Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/hostels` | List all hostels | Admin |
| POST | `/api/admin/hostels` | Create hostel | Admin |
| GET | `/api/admin/rooms` | List rooms | Admin |
| POST | `/api/admin/rooms` | Create room | Admin |
| POST | `/api/admin/rooms/:id/tenants` | Add tenant to room | Admin |
| GET | `/api/admin/tenants` | List tenants with filtering | Admin |
| POST | `/api/admin/payments` | Record payment | Admin |
| GET | `/api/admin/payments/suggest` | Suggest payment allocations | Admin |
| GET | `/api/admin/expense-categories` | List expense categories | Admin |
| POST | `/api/admin/expense-categories` | Create expense category | Admin |
| POST | `/api/admin/expenses` | Create expense | Admin |

### Tenant Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/me/dues` | Get tenant dues | Tenant |
| GET | `/api/me/tenancy` | Get tenant tenancy info | Tenant |
| GET | `/api/me/payments` | Get payment history | Tenant |
| GET | `/api/me/rents` | Get rent history | Tenant |
| GET | `/api/me/bills` | Get bill history | Tenant |
| GET | `/api/me/dashboard` | Get dashboard data | Tenant |

### File Management Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/attachments` | Upload file | Yes |
| GET | `/api/attachments/:id` | Get file info | Yes |
| GET | `/api/attachments/:id/download` | Download file | Yes |
| DELETE | `/api/attachments/:id` | Delete file | Yes |
| GET | `/api/me/attachments` | List user files | Yes |

## 🗄️ Database Schema

The system uses MongoDB with the following main collections:

### Core Collections
- **Users**: Admin and tenant user accounts
- **Owners**: Hostel owner information
- **Hostels**: Hostel information and settings
- **Rooms**: Room details, capacity, and rent amounts
- **Tenancies**: Tenant-room relationships with active status
- **MonthlyRents**: Monthly rent records with payment status
- **Bills**: Additional bills (electricity, water, etc.)
- **Payments**: Payment records with allocations
- **PaymentAllocations**: Links payments to specific dues

### Supporting Collections
- **ExpenseCategories**: Configurable expense categories
- **Expenses**: Hostel expense records
- **InventoryItems**: Available inventory items
- **RoomInventory**: Room-specific inventory tracking
- **AuditLogs**: Complete audit trail for all changes
- **Attachments**: File metadata and storage information

## 🔧 Environment Variables

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
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 Development

### Backend Development
```bash
cd backend
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run seed         # Seed test data
npm run generate-rent # Generate monthly rents
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run lint         # Run ESLint
```

### Database Operations
```bash
# Seed test data
npm run seed

# Generate monthly rents (cron job)
npm run generate-rent

# Connect to MongoDB
mongosh mongodb://localhost:27017/hostel-management
```

## 🐳 Docker Deployment

### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up --build -d
```

### Manual Docker Commands
```bash
# Build backend image
cd backend && docker build -t hostel-backend .

# Build frontend image
cd frontend && docker build -t hostel-frontend .

# Run MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:7.0

# Run backend
docker run -d -p 5000:5000 --name hostel-backend hostel-backend

# Run frontend
docker run -d -p 5173:5173 --name hostel-frontend hostel-frontend
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage
```

### Frontend Tests
```bash
cd frontend
npm test                   # Run all tests
npm run test:ui            # Run tests with UI
npm run test:coverage      # Run tests with coverage
```

## 📊 Key Features Explained

### Payment Allocation System
The system supports intelligent payment allocation where a single payment can be distributed across multiple dues (rents and bills). The allocation follows these rules:
- Oldest dues are prioritized
- Partial payments are supported
- Automatic status updates (due → partial → paid)
- Complete audit trail for all changes

### Audit Logging
Every financial and tenancy change is logged with:
- Actor information (who made the change)
- Action type (create, update, delete)
- Before and after data snapshots
- Timestamp and table information

### File Storage Options
The system supports two file storage methods:
1. **Local Filesystem**: Files stored in server directory
2. **MongoDB GridFS**: Files stored in MongoDB
3. **Future**: Easy migration to AWS S3 or other cloud storage

### Role-Based Access Control
- **Admin**: Full access to all features
- **Tenant**: Limited to own data and profile updates
- **Middleware**: Automatic role checking on protected routes

## 🔒 Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on API endpoints
- CORS protection
- Input validation with Zod
- SQL injection prevention (MongoDB)
- File upload restrictions
- Audit logging for compliance

## 🚀 Production Deployment

### Environment Setup
1. Set production environment variables
2. Use production MongoDB instance
3. Configure proper CORS origins
4. Set up SSL/TLS certificates
5. Configure reverse proxy (nginx)

### Performance Optimization
- Enable MongoDB indexing
- Use Redis for session storage
- Implement API caching
- Optimize frontend bundle size
- Use CDN for static assets

### Monitoring
- Set up application monitoring
- Configure error tracking
- Monitor database performance
- Set up log aggregation
- Configure alerts for critical issues

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow the existing code style
- Add proper error handling

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API endpoints
- Test with the provided demo data

## 🔮 Future Enhancements

- [ ] Real-time notifications
- [ ] Mobile app (React Native)
- [ ] Advanced reporting and analytics
- [ ] Integration with payment gateways
- [ ] SMS notifications
- [ ] Multi-language support
- [ ] Advanced search with Elasticsearch
- [ ] Automated rent collection
- [ ] Maintenance scheduling
- [ ] Visitor management
