# Hostel Management System - Development Guide

## 🎯 Project Overview

This is a complete hostel management system built with modern web technologies. The system supports multiple hostels, tenant management, payment tracking, and comprehensive audit logging.

## 🏗️ Architecture

### Backend Architecture
- **Express.js** with TypeScript for API server
- **MongoDB** with Mongoose ODM for data persistence
- **JWT** authentication with refresh tokens
- **Multer** for file uploads with GridFS support
- **Zod** for runtime validation
- **node-cron** for scheduled tasks

### Frontend Architecture
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **React Query** for server state management
- **React Hook Form** with Zod validation

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- MongoDB 5.0+
- Git

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd hostel-management-system

# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Set up environment
cp backend/env.example backend/.env
# Edit backend/.env with your settings

# Start MongoDB
mongod

# Seed test data
npm run seed

# Start development servers
npm run dev
```

## 📁 Code Organization

### Backend Structure
```
backend/src/
├── controllers/     # Route handlers
├── middleware/      # Auth, validation, error handling
├── models/          # Mongoose schemas
├── routes/          # API route definitions
├── utils/           # Helper functions
├── scripts/         # Database scripts
└── app.ts          # Express app configuration
```

### Frontend Structure
```
frontend/src/
├── components/      # Reusable UI components
├── pages/           # Page components
├── contexts/        # React contexts
├── services/        # API client
├── types/           # TypeScript definitions
├── utils/           # Helper functions
├── App.tsx          # Main app component
└── main.tsx         # Entry point
```

## 🗄️ Database Design

### Key Collections
- **Users**: Authentication and user profiles
- **Hostels**: Hostel information
- **Rooms**: Room details and capacity
- **Tenancies**: Tenant-room relationships
- **MonthlyRents**: Monthly rent records
- **Payments**: Payment records with allocations
- **AuditLogs**: Complete audit trail

### Relationships
- Owner → Hostels (1:many)
- Hostel → Rooms (1:many)
- Room → Tenancies (1:many)
- Tenant → Tenancies (1:many)
- Tenancy → MonthlyRents (1:many)
- Payment → PaymentAllocations (1:many)

## 🔐 Authentication Flow

1. User logs in with email/password
2. Server validates credentials
3. JWT access token (15min) + refresh token (7days) issued
4. Client stores tokens in localStorage
5. API requests include Bearer token
6. Token refresh handled automatically

## 💰 Payment System

### Payment Allocation Logic
1. Admin records payment amount
2. System suggests allocation to oldest dues first
3. Admin can modify allocations
4. Payment is split across multiple dues
5. Status updates automatically (due → partial → paid)
6. Audit log records all changes

### Payment States
- **due**: No payment received
- **partial**: Partial payment received
- **paid**: Full payment received

## 📊 Audit Logging

Every financial/tenancy change is logged:
- Actor (who made the change)
- Action type (create/update/delete)
- Table and record ID
- Before/after data snapshots
- Timestamp

## 📁 File Management

### Storage Options
1. **Local Filesystem**: Files stored in server directory
2. **MongoDB GridFS**: Files stored in database
3. **Future**: Easy migration to cloud storage

### File Types Supported
- Images: JPEG, PNG, GIF
- Documents: PDF
- Configurable via environment variables

## 🧪 Testing Strategy

### Backend Testing
- Unit tests for utilities and helpers
- Integration tests for API endpoints
- Database tests with test database

### Frontend Testing
- Component tests with React Testing Library
- Integration tests for user flows
- API client tests

## 🚀 Deployment

### Development
```bash
npm run dev          # Start both frontend and backend
npm run dev:backend  # Backend only
npm run dev:frontend # Frontend only
```

### Production
```bash
npm run build        # Build both applications
npm start           # Start production server
```

### Docker
```bash
docker-compose up -d  # Start all services
```

## 🔧 Configuration

### Environment Variables
- **NODE_ENV**: Environment (development/production)
- **PORT**: Server port
- **MONGODB_URI**: Database connection string
- **JWT_SECRET**: JWT signing secret
- **UPLOADS_DIR**: File upload directory
- **CORS_ORIGIN**: Allowed frontend origin

### Feature Flags
- File storage type (local/gridfs)
- Rate limiting settings
- File size limits
- Allowed file types

## 📈 Performance Considerations

### Database
- Proper indexing on frequently queried fields
- Aggregation pipelines for complex queries
- Connection pooling

### Frontend
- Code splitting with React.lazy
- Image optimization
- Bundle size monitoring
- Caching with React Query

### Backend
- Request/response compression
- Rate limiting
- File upload streaming
- Database query optimization

## 🐛 Debugging

### Backend Debugging
- Use `console.log` for development
- Enable MongoDB query logging
- Use Node.js debugger
- Check audit logs for data changes

### Frontend Debugging
- React Developer Tools
- Network tab for API calls
- Console for errors
- React Query DevTools

## 🔄 Data Migration

### Seeding Data
```bash
npm run seed  # Create test data
```

### Monthly Rent Generation
```bash
npm run generate-rent  # Generate monthly rents
```

### Database Backup
```bash
mongodump --db hostel-management --out backup/
```

## 📝 Code Style

### TypeScript
- Strict mode enabled
- No implicit any
- Proper type definitions
- Interface over type when possible

### React
- Functional components with hooks
- Custom hooks for reusable logic
- Proper error boundaries
- Accessibility considerations

### Backend
- Async/await over callbacks
- Proper error handling
- Input validation
- Security best practices

## 🚨 Common Issues

### Development Issues
1. **MongoDB connection**: Check if MongoDB is running
2. **Port conflicts**: Ensure ports 5000 and 5173 are free
3. **Environment variables**: Check .env file exists
4. **Dependencies**: Run npm install in both directories

### Production Issues
1. **File uploads**: Check uploads directory permissions
2. **Database**: Ensure MongoDB is accessible
3. **CORS**: Verify CORS_ORIGIN setting
4. **SSL**: Configure HTTPS for production

## 📚 Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)

## 🤝 Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation
4. Create meaningful commit messages
5. Test thoroughly before submitting PR

## 📞 Support

For development questions:
- Check this guide first
- Review the main README
- Look at existing code examples
- Create an issue if needed
