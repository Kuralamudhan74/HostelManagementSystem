# Database Seed Data Documentation

## Overview
The data you see in the application comes from **MongoDB** - not mock data! The frontend makes real API calls to the backend, which queries the MongoDB database.

## Data Flow
```
Frontend (React) → API Calls → Backend (Express) → MongoDB Database
```

## Seed Script Location
The seed script is located at: `backend/src/scripts/seed.ts`

## What Data Gets Inserted

### 1. Users (2 admins + 4 tenants)
- **Admin**: admin@hostel.com / admin123
- **Tenants**:
  - tenant1@hostel.com / tenant123
  - tenant2@hostel.com / tenant123
  - tenant3@hostel.com / tenant123
  - tenant4@hostel.com / tenant123

### 2. Owner
- Name: John Smith
- Email: owner@hostel.com
- Phone: +1234567891

### 3. Hostel
- Name: "Sunshine Hostel"
- Address: 456 Hostel Avenue, City, State 12345
- Total Rooms: 3

### 4. Rooms (3 rooms)
- **Room 101**: Capacity 2, Rent $500
- **Room 102**: Capacity 1, Rent $400
- **Room 103**: Capacity 3, Rent $750

### 5. Tenancies (4 active tenancies)
- **Room 101**: 
  - Alice Johnson (since Jan 2024, share $250)
  - Bob Wilson (since Jan 2024, share $250)
- **Room 102**: 
  - Charlie Brown (since Feb 2024, share $400)
- **Room 103**: 
  - Diana Davis (since Jan 2024, share $250)

### 6. Monthly Rents
- Created for last 4 months for each tenant
- Current month marked as "due" (unpaid)
- Previous months marked as "paid"
- Due date: 5th of each month

### 7. Bills (2 bills)
- Electricity Bill: $50 (paid)
- Water Bill: $30 (due)

### 8. Expense Categories (6 categories)
- Maintenance
- Utilities
- Cleaning
- Security
- Insurance
- Other

### 9. Expenses (2 expenses)
- Plumbing repair in room 101: $200
- Monthly electricity bill: $150

### 10. Inventory Items (5 items)
- Bed
- Desk
- Wardrobe
- Fan
- Light

### 11. Room Inventory
- Room 101: 2 beds, 2 desks
- Room 102: 1 bed
- Room 103: 3 beds

## How to Re-run Seed Script

### Option 1: Using npm script (Recommended)
```bash
cd backend
npm run seed
```

### Option 2: Using ts-node directly
```bash
cd backend
npx ts-node src/scripts/seed.ts
```

## What the Seed Script Does

1. **Connects to MongoDB** using the connection string from `.env` file
2. **Clears all existing data** (deletes all records from all collections)
3. **Creates fresh data** in this order:
   - Users (admin + tenants)
   - Owner
   - Hostel
   - Rooms
   - Tenancies (links tenants to rooms)
   - Monthly Rents (for last 4 months)
   - Bills
   - Expense Categories
   - Expenses
   - Inventory Items
   - Room Inventory
4. **Prints summary** with credentials and data overview
5. **Closes database connection** and exits

## Important Notes

- The seed script uses **real MongoDB** - not mock data
- All passwords are hashed using bcrypt
- All dates are real Date objects, not strings
- Tenancies are linked to rooms and tenants using MongoDB ObjectIds
- The script clears existing data before inserting new data

## Example Output

```
Connected to MongoDB
Cleared existing data
Created admin user
Created owner
Created hostel
Created rooms
Created tenant users
Created tenancies
Created monthly rents
Created bills
Created expense categories
Created expenses
Created inventory items
Created room inventory

=== Seed Data Summary ===
Admin User: admin@hostel.com / admin123
Tenant Users: tenant1@hostel.com, tenant2@hostel.com, tenant3@hostel.com, tenant4@hostel.com / tenant123
Hostel: Sunshine Hostel
Rooms: 101 (2 tenants), 102 (1 tenant), 103 (1 tenant)
Monthly rents created for last 4 months
Sample bills and expenses created
Inventory items and room assignments created
Database connection closed
```

## Login Credentials

### Admin Account
- Email: admin@hostel.com
- Password: admin123
- Role: admin
- Can create users, manage hostels, record payments, etc.

### Tenant Accounts
- Email: tenant1@hostel.com
- Password: tenant123
- Role: tenant
- Associated with Room 101 ($250/month share)

- Email: tenant2@hostel.com
- Password: tenant123
- Role: tenant
- Associated with Room 101 ($250/month share)

- Email: tenant3@hostel.com
- Password: tenant123
- Role: tenant
- Associated with Room 102 ($400/month)

- Email: tenant4@hostel.com
- Password: tenant123
- Role: tenant
- Associated with Room 103 ($250/month share)

## Need to Clear All Data?

If you need to reset the database and start fresh:

```bash
cd backend
npm run seed
```

This will:
1. Delete all existing data
2. Create new seed data
3. Give you fresh test data to work with

## Customizing Seed Data

To modify the seed data:
1. Edit `backend/src/scripts/seed.ts`
2. Modify any of the data objects (users, hostels, rooms, etc.)
3. Run `npm run seed` to apply changes

## Viewing Data in MongoDB

You can use MongoDB Compass or mongosh to view the data:

```bash
mongosh
use hostel-management
db.users.find().pretty()
db.hostels.find().pretty()
db.rooms.find().pretty()
db.tenancies.find().pretty()
```


