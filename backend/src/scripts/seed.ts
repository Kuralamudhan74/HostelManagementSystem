import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { 
  User, 
  Owner, 
  Hostel, 
  Room, 
  Tenancy, 
  MonthlyRent, 
  Bill, 
  ExpenseCategory,
  Expense,
  InventoryItem,
  RoomInventory
} from '../models';
import { hashPassword } from '../middleware/auth';

// Load environment variables
dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel-management';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Owner.deleteMany({}),
      Hostel.deleteMany({}),
      Room.deleteMany({}),
      Tenancy.deleteMany({}),
      MonthlyRent.deleteMany({}),
      Bill.deleteMany({}),
      ExpenseCategory.deleteMany({}),
      Expense.deleteMany({}),
      InventoryItem.deleteMany({}),
      RoomInventory.deleteMany({})
    ]);

    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    const admin = new User({
      email: 'admin@hostel.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890',
      role: 'admin',
      isActive: true
    });
    await admin.save();
    console.log('Created admin user');

    // Create owner
    const owner = new Owner({
      name: 'John Smith',
      email: 'owner@hostel.com',
      phone: '+1234567891',
      address: '123 Main Street, City, State 12345'
    });
    await owner.save();
    console.log('Created owner');

    // Create hostel
    const hostel = new Hostel({
      name: 'Sunshine Hostel',
      address: '456 Hostel Avenue, City, State 12345',
      ownerId: owner._id,
      totalRooms: 3,
      isActive: true
    });
    await hostel.save();
    console.log('Created hostel');

    // Create rooms
    const rooms = [
      {
        roomNumber: '101',
        hostelId: hostel._id,
        capacity: 2,
        rentAmount: 500
      },
      {
        roomNumber: '102',
        hostelId: hostel._id,
        capacity: 1,
        rentAmount: 400
      },
      {
        roomNumber: '103',
        hostelId: hostel._id,
        capacity: 3,
        rentAmount: 750
      }
    ];

    const createdRooms = [];
    for (const roomData of rooms) {
      const room = new Room(roomData);
      await room.save();
      createdRooms.push(room);
    }
    console.log('Created rooms');

    // Create tenant users
    const tenantPassword = await hashPassword('tenant123');
    const tenants = [
      {
        email: 'tenant1@hostel.com',
        password: tenantPassword,
        firstName: 'Alice',
        lastName: 'Johnson',
        phone: '+1234567892',
        role: 'tenant',
        isActive: true
      },
      {
        email: 'tenant2@hostel.com',
        password: tenantPassword,
        firstName: 'Bob',
        lastName: 'Wilson',
        phone: '+1234567893',
        role: 'tenant',
        isActive: true
      },
      {
        email: 'tenant3@hostel.com',
        password: tenantPassword,
        firstName: 'Charlie',
        lastName: 'Brown',
        phone: '+1234567894',
        role: 'tenant',
        isActive: true
      },
      {
        email: 'tenant4@hostel.com',
        password: tenantPassword,
        firstName: 'Diana',
        lastName: 'Davis',
        phone: '+1234567895',
        role: 'tenant',
        isActive: true
      }
    ];

    const createdTenants = [];
    for (const tenantData of tenants) {
      const tenant = new User(tenantData);
      await tenant.save();
      createdTenants.push(tenant);
    }
    console.log('Created tenant users');

    // Create tenancies
    const tenancies = [
      {
        roomId: createdRooms[0]._id, // Room 101
        tenantId: createdTenants[0]._id, // Alice
        startDate: new Date('2024-01-01'),
        tenantShare: 250, // Half of 500
        isActive: true
      },
      {
        roomId: createdRooms[0]._id, // Room 101
        tenantId: createdTenants[1]._id, // Bob
        startDate: new Date('2024-01-15'),
        tenantShare: 250, // Half of 500
        isActive: true
      },
      {
        roomId: createdRooms[1]._id, // Room 102
        tenantId: createdTenants[2]._id, // Charlie
        startDate: new Date('2024-02-01'),
        tenantShare: 400, // Full amount
        isActive: true
      },
      {
        roomId: createdRooms[2]._id, // Room 103
        tenantId: createdTenants[3]._id, // Diana
        startDate: new Date('2024-01-01'),
        tenantShare: 250, // One third of 750
        isActive: true
      }
    ];

    const createdTenancies = [];
    for (const tenancyData of tenancies) {
      const tenancy = new Tenancy(tenancyData);
      await tenancy.save();
      createdTenancies.push(tenancy);
    }
    console.log('Created tenancies');

    // Create monthly rents for current and previous months
    const currentDate = new Date();
    const months = [];
    
    // Generate last 3 months and current month
    for (let i = 3; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    }

    const monthlyRents = [];
    for (const tenancy of createdTenancies) {
      for (const month of months) {
        const rent = new MonthlyRent({
          tenancyId: tenancy._id,
          amount: tenancy.tenantShare || 0,
          amountPaid: month === months[months.length - 1] ? 0 : tenancy.tenantShare || 0, // Current month unpaid
          status: month === months[months.length - 1] ? 'due' : 'paid',
          dueDate: new Date(month + '-05'), // 5th of each month
          period: month
        });
        await rent.save();
        monthlyRents.push(rent);
      }
    }
    console.log('Created monthly rents');

    // Create some bills
    const bills = [
      {
        tenancyId: createdTenancies[0]._id,
        title: 'Electricity Bill',
        description: 'Monthly electricity charges',
        amount: 50,
        amountPaid: 50,
        status: 'paid',
        dueDate: new Date('2024-01-15'),
        billType: 'electricity'
      },
      {
        tenancyId: createdTenancies[1]._id,
        title: 'Water Bill',
        description: 'Monthly water charges',
        amount: 30,
        amountPaid: 0,
        status: 'due',
        dueDate: new Date('2024-02-15'),
        billType: 'water'
      }
    ];

    for (const billData of bills) {
      const bill = new Bill(billData);
      await bill.save();
    }
    console.log('Created bills');

    // Create expense categories
    const expenseCategories = [
      { name: 'Maintenance', description: 'Building maintenance and repairs' },
      { name: 'Utilities', description: 'Electricity, water, gas bills' },
      { name: 'Cleaning', description: 'Cleaning supplies and services' },
      { name: 'Security', description: 'Security services and equipment' },
      { name: 'Insurance', description: 'Property and liability insurance' },
      { name: 'Other', description: 'Miscellaneous expenses' }
    ];

    const createdCategories = [];
    for (const categoryData of expenseCategories) {
      const category = new ExpenseCategory(categoryData);
      await category.save();
      createdCategories.push(category);
    }
    console.log('Created expense categories');

    // Create some expenses
    const expenses = [
      {
        hostelId: hostel._id,
        categoryId: createdCategories[0]._id, // Maintenance
        amount: 200,
        description: 'Plumbing repair in room 101',
        expenseDate: new Date('2024-01-10')
      },
      {
        hostelId: hostel._id,
        categoryId: createdCategories[1]._id, // Utilities
        amount: 150,
        description: 'Monthly electricity bill',
        expenseDate: new Date('2024-01-15')
      }
    ];

    for (const expenseData of expenses) {
      const expense = new Expense(expenseData);
      await expense.save();
    }
    console.log('Created expenses');

    // Create inventory items
    const inventoryItems = [
      { name: 'Bed', description: 'Single bed with mattress', category: 'Furniture' },
      { name: 'Desk', description: 'Study desk with chair', category: 'Furniture' },
      { name: 'Wardrobe', description: 'Clothes storage cabinet', category: 'Furniture' },
      { name: 'Fan', description: 'Ceiling fan', category: 'Appliances' },
      { name: 'Light', description: 'Room lighting fixture', category: 'Appliances' }
    ];

    const createdItems = [];
    for (const itemData of inventoryItems) {
      const item = new InventoryItem(itemData);
      await item.save();
      createdItems.push(item);
    }
    console.log('Created inventory items');

    // Create room inventory
    const roomInventory = [
      {
        roomId: createdRooms[0]._id,
        itemId: createdItems[0]._id, // Bed
        quantity: 2,
        condition: 'good'
      },
      {
        roomId: createdRooms[0]._id,
        itemId: createdItems[1]._id, // Desk
        quantity: 2,
        condition: 'good'
      },
      {
        roomId: createdRooms[1]._id,
        itemId: createdItems[0]._id, // Bed
        quantity: 1,
        condition: 'fair'
      },
      {
        roomId: createdRooms[2]._id,
        itemId: createdItems[0]._id, // Bed
        quantity: 3,
        condition: 'good'
      }
    ];

    for (const inventoryData of roomInventory) {
      const inventory = new RoomInventory(inventoryData);
      await inventory.save();
    }
    console.log('Created room inventory');

    console.log('\n=== Seed Data Summary ===');
    console.log('Admin User: admin@hostel.com / admin123');
    console.log('Tenant Users: tenant1@hostel.com, tenant2@hostel.com, tenant3@hostel.com, tenant4@hostel.com / tenant123');
    console.log('Hostel: Sunshine Hostel');
    console.log('Rooms: 101 (2 tenants), 102 (1 tenant), 103 (1 tenant)');
    console.log('Monthly rents created for last 4 months');
    console.log('Sample bills and expenses created');
    console.log('Inventory items and room assignments created');

  } catch (error) {
    console.error('Seed data error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

seedData();
