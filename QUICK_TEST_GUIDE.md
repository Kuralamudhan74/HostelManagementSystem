# Quick Test Guide - Testing Real Data

## The Issue
The admin pages (Tenants Page, Rooms Page) are currently placeholder pages showing "Coming Soon" messages. However, the **backend APIs are fully functional** and ready to test!

## Solution Options

### Option 1: Test via Browser Console (Quickest)

1. **Login** to the app at http://localhost:5173 with admin credentials
2. **Open Browser Console** (F12)
3. **Run these commands** in the console:

```javascript
// Get access to apiClient
const apiClient = window.apiClient || {};

// Since apiClient isn't exposed, we'll make direct API calls

// First, get your token
const token = localStorage.getItem('accessToken');
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

#### Example: Get All Hostels
```javascript
fetch('/api/admin/hostels', { headers })
  .then(r => r.json())
  .then(console.log);
```

#### Example: Get All Tenants
```javascript
fetch('/api/admin/tenants', { headers })
  .then(r => r.json())
  .then(console.log);
```

#### Example: Get All Rooms
```javascript
fetch('/api/admin/rooms', { headers })
  .then(r => r.json())
  .then(console.log);
```

---

### Option 2: Use PowerShell to Test APIs

Create a file `test-real-data.ps1` in the project root:

```powershell
# 1. Login as Admin
$loginBody = @{
    email = "admin@hostel.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

$token = $loginResponse.token
Write-Host "✓ Logged in as admin" -ForegroundColor Green

# 2. Get Hostels
$headers = @{ Authorization = "Bearer $token" }
$hostels = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/hostels" `
    -Method GET `
    -Headers $headers

Write-Host "`n✓ Hostels:" -ForegroundColor Green
$hostels.hostels | ForEach-Object {
    Write-Host "  - $($_.name) (ID: $($_.id))" -ForegroundColor Cyan
}

# 3. Get Tenants
$tenants = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/tenants" `
    -Method GET `
    -Headers $headers

Write-Host "`n✓ Tenants:" -ForegroundColor Green
$tenants.tenancies | ForEach-Object {
    Write-Host "  - $($_.tenantId.firstName) $($_.tenantId.lastName) (Room: $($_.roomId.roomNumber))" -ForegroundColor Cyan
}

# 4. Get Rooms
$rooms = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/rooms" `
    -Method GET `
    -Headers $headers

Write-Host "`n✓ Rooms:" -ForegroundColor Green
$rooms.rooms | ForEach-Object {
    Write-Host "  - $($_.roomNumber) (Capacity: $($_.capacity), Rent: $$($_.rentAmount))" -ForegroundColor Cyan
}
```

Run with:
```powershell
cd "D:\Synora Technology\Hostel Management"
.\test-real-data.ps1
```

---

### Option 3: Test Tenant Registration (Create New User)

To create a new tenant user:

```powershell
# Step 1: Login as admin
$loginBody = @{
    email = "admin@hostel.com"
    password = "admin123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -ContentType "application/json" `
    -Body $loginBody

$token = $response.token

# Step 2: Register new tenant
$headers = @{
    Authorization = "Bearer $token"
    'Content-Type' = 'application/json'
}

$newUserBody = @{
    email = "realtenant@test.com"
    password = "test123"
    firstName = "Real"
    lastName = "Tenant"
    phone = "+1234567897"
    role = "tenant"
} | ConvertTo-Json

$newUser = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
    -Method POST `
    -Headers $headers `
    -Body $newUserBody

Write-Host "✓ Created user: $($newUser.user.id)" -ForegroundColor Green

# Step 3: Get room ID
$rooms = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/rooms" `
    -Method GET `
    -Headers $headers

$firstRoomId = $rooms.rooms[0].id

# Step 4: Add tenant to room
$addTenantBody = @{
    tenantId = $newUser.user.id
    startDate = "2024-03-01"
    tenantShare = 300
} | ConvertTo-Json

$tenancy = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/rooms/$firstRoomId/tenants" `
    -Method POST `
    -Headers $headers `
    -Body $addTenantBody

Write-Host "✓ Added tenant to room" -ForegroundColor Green
```

---

### Option 4: Quick Browser Test

Open http://localhost:5173 and open browser console (F12), then paste:

```javascript
// Test if you're logged in
const token = localStorage.getItem('accessToken');
console.log('Token:', token ? 'Present' : 'Missing');

// Test API call
fetch('/api/admin/tenants', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(data => console.log('Tenants:', data))
.catch(err => console.error('Error:', err));
```

---

## What's Working

✅ **Backend APIs** - All functional
✅ **Authentication** - JWT tokens working
✅ **Database** - MongoDB connected with real data
✅ **API Endpoints** - All routes responding

## What's Not Complete

❌ **Admin UI Pages** - Currently showing placeholder content
- TenantsPage.tsx - Placeholder
- RoomsPage.tsx - Placeholder

---

## Next Steps to Build Complete UI

I can create fully functional UI pages for:
1. **Tenants Management** - List, search, add, assign to rooms
2. **Rooms Management** - List, create, edit, view occupants
3. **User Registration** - Admin UI to create new users
4. **All other admin/tenant features**

Would you like me to build these complete UI pages now?

---

## Quick Commands Summary

```bash
# Backend is running on: http://localhost:5000
# Frontend is running on: http://localhost:5173

# Login credentials:
Email: admin@hostel.com
Password: admin123

# Test APIs with:
curl http://localhost:5000/api/admin/hostels -H "Authorization: Bearer YOUR_TOKEN"
```

