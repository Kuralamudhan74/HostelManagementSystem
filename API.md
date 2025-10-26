# Hostel Management System - API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication

All API requests (except login and refresh) require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response
```json
{
  "message": "Success message",
  "data": { ... }
}
```

### Error Response
```json
{
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Authentication Endpoints

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "admin@hostel.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "email": "admin@hostel.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /auth/logout
Logout user (requires authentication).

**Response:**
```json
{
  "message": "Logout successful"
}
```

## User Profile Endpoints

### GET /me
Get current user profile (requires authentication).

**Response:**
```json
{
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "email": "admin@hostel.com",
    "firstName": "Admin",
    "lastName": "User",
    "phone": "+1234567890",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PATCH /me
Update user profile (requires authentication).

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "email": "admin@hostel.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "admin"
  }
}
```

## Admin Endpoints

### GET /admin/hostels
Get all hostels (requires admin authentication).

**Response:**
```json
{
  "hostels": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "name": "Sunshine Hostel",
      "address": "456 Hostel Avenue, City, State 12345",
      "ownerId": "64f1a2b3c4d5e6f7g8h9i0j2",
      "totalRooms": 3,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /admin/hostels
Create new hostel (requires admin authentication).

**Request Body:**
```json
{
  "name": "New Hostel",
  "address": "123 Main Street, City, State 12345",
  "ownerId": "64f1a2b3c4d5e6f7g8h9i0j2"
}
```

**Response:**
```json
{
  "message": "Hostel created successfully",
  "hostel": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "name": "New Hostel",
    "address": "123 Main Street, City, State 12345",
    "ownerId": "64f1a2b3c4d5e6f7g8h9i0j2",
    "totalRooms": 0,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /admin/rooms
Get all rooms (requires admin authentication).

**Query Parameters:**
- `hostelId` (optional): Filter by hostel ID

**Response:**
```json
{
  "rooms": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "roomNumber": "101",
      "hostelId": "64f1a2b3c4d5e6f7g8h9i0j2",
      "capacity": 2,
      "rentAmount": 500,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST /admin/rooms
Create new room (requires admin authentication).

**Request Body:**
```json
{
  "roomNumber": "102",
  "hostelId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "capacity": 1,
  "rentAmount": 400
}
```

**Response:**
```json
{
  "message": "Room created successfully",
  "room": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "roomNumber": "102",
    "hostelId": "64f1a2b3c4d5e6f7g8h9i0j2",
    "capacity": 1,
    "rentAmount": 400,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### POST /admin/rooms/:roomId/tenants
Add tenant to room (requires admin authentication).

**Request Body:**
```json
{
  "tenantId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "startDate": "2024-01-01T00:00:00.000Z",
  "tenantShare": 250
}
```

**Response:**
```json
{
  "message": "Tenant added to room successfully",
  "tenancy": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "roomId": "64f1a2b3c4d5e6f7g8h9i0j2",
    "tenantId": "64f1a2b3c4d5e6f7g8h9i0j3",
    "startDate": "2024-01-01T00:00:00.000Z",
    "tenantShare": 250,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /admin/tenants
Get tenants with filtering (requires admin authentication).

**Query Parameters:**
- `hostelId` (optional): Filter by hostel ID
- `room` (optional): Filter by room number
- `name` (optional): Filter by tenant name
- `month` (optional): Filter by month
- `active` (optional): Filter by active status (true/false)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "tenancies": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "roomId": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "roomNumber": "101",
        "hostelId": {
          "id": "64f1a2b3c4d5e6f7g8h9i0j3",
          "name": "Sunshine Hostel"
        }
      },
      "tenantId": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j4",
        "firstName": "Alice",
        "lastName": "Johnson",
        "email": "alice@example.com",
        "phone": "+1234567890"
      },
      "startDate": "2024-01-01T00:00:00.000Z",
      "tenantShare": 250,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

### POST /admin/payments
Record payment (requires admin authentication).

**Request Body:**
```json
{
  "tenantId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "amount": 500,
  "paymentMethod": "cash",
  "paymentDate": "2024-01-01T00:00:00.000Z",
  "description": "Monthly rent payment",
  "allocations": [
    {
      "dueId": "64f1a2b3c4d5e6f7g8h9i0j4",
      "dueType": "rent",
      "amount": 500
    }
  ]
}
```

**Response:**
```json
{
  "message": "Payment recorded successfully",
  "payment": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "tenantId": "64f1a2b3c4d5e6f7g8h9i0j3",
    "amount": 500,
    "paymentMethod": "cash",
    "paymentDate": "2024-01-01T00:00:00.000Z",
    "description": "Monthly rent payment",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /admin/payments/suggest
Suggest payment allocations (requires admin authentication).

**Query Parameters:**
- `tenantId`: Tenant ID
- `amount`: Payment amount

**Response:**
```json
{
  "suggestions": [
    {
      "dueId": "64f1a2b3c4d5e6f7g8h9i0j4",
      "dueType": "rent",
      "amount": 500
    }
  ]
}
```

## Tenant Endpoints

### GET /me/dues
Get tenant dues (requires tenant authentication).

**Query Parameters:**
- `month` (optional): Filter by month (YYYY-MM)

**Response:**
```json
{
  "dues": {
    "rents": [
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j1",
        "amount": 500,
        "amountPaid": 0,
        "status": "due",
        "dueDate": "2024-01-05T00:00:00.000Z",
        "period": "2024-01"
      }
    ],
    "bills": [
      {
        "id": "64f1a2b3c4d5e6f7g8h9i0j2",
        "title": "Electricity Bill",
        "amount": 50,
        "amountPaid": 0,
        "status": "due",
        "dueDate": "2024-01-15T00:00:00.000Z"
      }
    ],
    "totalOutstanding": 550
  },
  "paymentHistory": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j3",
      "amount": 500,
      "paymentMethod": "cash",
      "paymentDate": "2023-12-01T00:00:00.000Z",
      "description": "Monthly rent"
    }
  ]
}
```

### GET /me/tenancy
Get tenant tenancy information (requires tenant authentication).

**Response:**
```json
{
  "tenancy": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "roomId": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "roomNumber": "101",
      "hostelId": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j3",
        "name": "Sunshine Hostel",
        "address": "456 Hostel Avenue, City, State 12345"
      }
    },
    "tenantId": "64f1a2b3c4d5e6f7g8h9i0j4",
    "startDate": "2024-01-01T00:00:00.000Z",
    "tenantShare": 250,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /me/dashboard
Get tenant dashboard data (requires tenant authentication).

**Response:**
```json
{
  "tenancy": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "roomId": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "roomNumber": "101",
      "hostelId": {
        "id": "64f1a2b3c4d5e6f7g8h9i0j3",
        "name": "Sunshine Hostel",
        "address": "456 Hostel Avenue, City, State 12345"
      }
    },
    "tenantId": "64f1a2b3c4d5e6f7g8h9i0j4",
    "startDate": "2024-01-01T00:00:00.000Z",
    "tenantShare": 250,
    "isActive": true
  },
  "dues": {
    "rents": [...],
    "bills": [...],
    "totalOutstanding": 550
  },
  "recentPayments": [...],
  "currentRent": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j5",
    "amount": 500,
    "amountPaid": 0,
    "status": "due",
    "period": "2024-01"
  }
}
```

## File Management Endpoints

### POST /attachments
Upload file (requires authentication).

**Request:** Multipart form data
- `file`: File to upload
- `description` (optional): File description

**Response:**
```json
{
  "message": "File uploaded successfully",
  "attachment": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "filename": "receipt-1234567890.pdf",
    "originalName": "rent_receipt.pdf",
    "mimetype": "application/pdf",
    "size": 1024000,
    "uploadedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /attachments/:id
Get file information (requires authentication).

**Response:**
```json
{
  "attachment": {
    "id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "filename": "receipt-1234567890.pdf",
    "originalName": "rent_receipt.pdf",
    "mimetype": "application/pdf",
    "size": 1024000,
    "storageType": "local",
    "uploadedBy": {
      "id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "firstName": "Alice",
      "lastName": "Johnson",
      "email": "alice@example.com"
    },
    "uploadedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /attachments/:id/download
Download file (requires authentication).

**Response:** File binary data

### DELETE /attachments/:id
Delete file (requires authentication).

**Response:**
```json
{
  "message": "Attachment deleted successfully"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error - Server error |

## Rate Limiting

API requests are rate limited to 100 requests per 15 minutes per IP address.

## File Upload Limits

- Maximum file size: 10MB
- Allowed file types: JPEG, PNG, GIF, PDF
- Files are stored locally or in MongoDB GridFS
