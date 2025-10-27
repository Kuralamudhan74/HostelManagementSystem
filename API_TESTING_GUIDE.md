# API Testing Guide

This guide will help you test all the APIs in the Hostel Management System with real-time data.

## Prerequisites

1. **Start MongoDB** (if not running):
   ```bash
   # Check if MongoDB is running
   Get-Service -Name MongoDB
   
   # If not running, start it
   Start-Service MongoDB
   ```

2. **Start Backend Server**:
   ```bash
   cd backend
   npm run dev
   ```
   Backend will run on: http://localhost:5000

3. **Start Frontend Server** (in a new terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will run on: http://localhost:5173

## Login Credentials

First, login to get your authentication token:

```
Email: admin@hostel.com
Password: admin123
```

## Testing APIs

### Option 1: Using the UI (Easiest)
Just use the web interface at http://localhost:5173

### Option 2: Using PowerShell/Curl
I'll provide curl commands for testing

### Option 3: Using Postman
Import the API collection (if available)

---

## 1. Authentication APIs

### Login
```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@hostel.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "...",
    "email": "admin@hostel.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }
}
```

### Register New User (Admin Only)
```bash
POST http://localhost:5000/api/auth/register
Authorization: Bearer {token}
Content-Type: application/json

{
  "email": "newuser@hostel.com",
  "password": "password123",
  "firstName": "New",
  "lastName": "User",
  "phone": "+1234567890",
  "role": "tenant"
}
```

---

## 2. Profile APIs

### Get My Profile
```bash
GET http://localhost:5000/api/me
Authorization: Bearer {token}
```

### Update Profile
```bash
PATCH http://localhost:5000/api/me
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "Updated",
  "lastName": "Name",
  "phone": "+1234567890"
}
```

---

## 3. Admin APIs - Hostels

### Create Hostel
```bash
POST http://localhost:5000/api/admin/hostels
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Green Valley Hostel",
  "address": "789 Valley Road, City, State 12345",
  "totalRooms": 5
}
```

### Get All Hostels
```bash
GET http://localhost:5000/api/admin/hostels
Authorization: Bearer {token}
```

---

## 4. Admin APIs - Rooms

### Create Room
```bash
POST http://localhost:5000/api/admin/rooms
Authorization: Bearer {token}
Content-Type: application/json

{
  "roomNumber": "201",
  "hostelId": "{hostel_id_here}",
  "capacity": 2,
  "rentAmount": 600
}
```

### Get All Rooms
```bash
GET http://localhost:5000/api/admin/rooms?hostelId={hostel_id}
Authorization: Bearer {token}
```

---

## 5. Admin APIs - Tenants

### Add Tenant to Room
```bash
POST http://localhost:5000/api/admin/rooms/{roomId}/tenants
Authorization: Bearer {token}
Content-Type: application/json

{
  "tenantId": "{user_id_here}",
  "startDate": "2024-03-01",
  "tenantShare": 300
}
```

### Get All Tenants
```bash
GET http://localhost:5000/api/admin/tenants?limit=20&offset=0
Authorization: Bearer {token}
```

### Get Tenant by Name or Room
```bash
GET http://localhost:5000/api/admin/tenants?search=alice&roomNumber=101
Authorization: Bearer {token}
```

---

## 6. Admin APIs - Payments

### Record Payment
```bash
POST http://localhost:5000/api/admin/payments
Authorization: Bearer {token}
Content-Type: application/json

{
  "tenantId": "{tenant_id}",
  "amount": 250,
  "paymentMethod": "cash",
  "paymentDate": "2024-03-15",
  "description": "Monthly rent payment",
  "allocations": [
    {
      "type": "rent",
      "targetId": "{monthly_rent_id}",
      "amount": 250
    }
  ]
}
```

### Suggest Payment Allocations
```bash
GET http://localhost:5000/api/admin/payments/suggest?tenantId={tenant_id}&amount=250
Authorization: Bearer {token}
```

---

## 7. Admin APIs - Expenses

### Get Expense Categories
```bash
GET http://localhost:5000/api/admin/expense-categories
Authorization: Bearer {token}
```

### Create Expense Category
```bash
POST http://localhost:5000/api/admin/expense-categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Internet",
  "description": "Monthly internet bills"
}
```

### Create Expense
```bash
POST http://localhost:5000/api/admin/expenses
Authorization: Bearer {token}
Content-Type: application/json

{
  "hostelId": "{hostel_id}",
  "categoryId": "{category_id}",
  "amount": 100,
  "description": "Internet bill for March",
  "expenseDate": "2024-03-01"
}
```

---

## 8. Tenant APIs

These are for tenant users (role: tenant). You'll need to login as a tenant first.

### Get My Dues
```bash
GET http://localhost:5000/api/me/dues
Authorization: Bearer {tenant_token}
```

### Get My Tenancy
```bash
GET http://localhost:5000/api/me/tenancy
Authorization: Bearer {tenant_token}
```

### Get My Payment History
```bash
GET http://localhost:5000/api/me/payments
Authorization: Bearer {tenant_token}
```

### Get My Rent History
```bash
GET http://localhost:5000/api/me/rents?period=2024-03
Authorization: Bearer {tenant_token}
```

### Get My Bill History
```bash
GET http://localhost:5000/api/me/bills
Authorization: Bearer {tenant_token}
```

### Get My Dashboard
```bash
GET http://localhost:5000/api/me/dashboard
Authorization: Bearer {tenant_token}
```

---

## 9. Attachment APIs

### Upload Attachment
```bash
POST http://localhost:5000/api/attachments
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [select file]
description: "Payment receipt"
```

### Get Attachment Info
```bash
GET http://localhost:5000/api/attachments/{attachment_id}
Authorization: Bearer {token}
```

### Download Attachment
```bash
GET http://localhost:5000/api/attachments/{attachment_id}/download
Authorization: Bearer {token}
```

### Delete Attachment
```bash
DELETE http://localhost:5000/api/attachments/{attachment_id}
Authorization: Bearer {token}
```

### Get My Attachments
```bash
GET http://localhost:5000/api/me/attachments
Authorization: Bearer {token}
```

---

## Quick Test Script

Save this as `test-apis.ps1` in the project root:

```powershell
# Login and get token
$loginBody = @{
    email = "admin@hostel.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

$token = $response.token
Write-Host "Logged in! Token: $($token.Substring(0, 20))..."

# Get hostels
$headers = @{
    Authorization = "Bearer $token"
}

$hostels = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/hostels" `
    -Method GET `
    -Headers $headers

Write-Host "Found $($hostels.hostels.Count) hostels"

# Get tenants
$tenants = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/tenants" `
    -Method GET `
    -Headers $headers

Write-Host "Found $($tenants.tenancies.Count) tenants"
```

Run with:
```powershell
.\test-apis.ps1
```

---

## Testing with UI

### Creating a New Tenant (as Admin)

1. Login as admin at http://localhost:5173
2. Go to "Tenants" page
3. Click "Add Tenant" (if available in UI)
4. Fill in tenant details
5. Click "Save"

### Creating a New User (as Admin)

Since registration API exists, you can use it from the API directly.

---

## Testing Checklist

- [ ] Login as admin
- [ ] View hostels
- [ ] Create new hostel
- [ ] View rooms
- [ ] Create new room
- [ ] View tenants
- [ ] Add tenant to room
- [ ] Record payment for tenant
- [ ] Create expense
- [ ] Upload attachment
- [ ] View tenant dashboard (login as tenant)
- [ ] View tenant dues
- [ ] Update profile

---

## Common Test Scenarios

### Scenario 1: Complete New Tenant Flow
1. Login as admin
2. Create new hostel
3. Create new room in that hostel
4. Create new user with role "tenant"
5. Add tenant to room
6. Verify tenant appears in dashboard
7. Record payment for that tenant

### Scenario 2: Test Payment Allocation
1. Login as admin
2. Get tenant dues
3. Record partial payment
4. Verify payment is allocated correctly
5. Check tenant's outstanding balance

### Scenario 3: Test File Upload
1. Login as admin or tenant
2. Upload a payment receipt
3. View attachment details
4. Download attachment
5. Delete attachment

### Scenario 4: Test Tenant View
1. Login as tenant (tenant1@hostel.com / tenant123)
2. View dashboard
3. View dues
4. View payment history
5. Update profile (only allowed fields)

---

## Troubleshooting

### Issue: "Invalid token"
- Token has expired, login again to get a new token

### Issue: "Permission denied"
- You're trying to access admin routes with a tenant account or vice versa

### Issue: "User already exists"
- The email is already registered, use a different email

### Issue: "MongoDB connection error"
- Make sure MongoDB service is running
- Check MONGODB_URI in backend/.env file

---

## Next Steps

1. Start both servers
2. Login to the UI
3. Start testing each feature
4. Create real data (not just seed data)
5. Test all CRUD operations
6. Test file uploads
7. Test payments
8. Test tenant access restrictions

