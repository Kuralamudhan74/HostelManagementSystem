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
  RoomInventory,
  Payment,
  PaymentAllocation
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
      PaymentAllocation.deleteMany({}),
      Payment.deleteMany({}),
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
      firstName: 'Rajesh',
      lastName: 'Kumar',
      phone: '+919876543210',
      role: 'admin',
      isActive: true
    });
    await admin.save();
    console.log('Created admin user');

    // Create owner
    const owner = new Owner({
      name: 'Priya Sharma',
      email: 'owner@hostel.com',
      phone: '+919876543211',
      address: '123 MG Road, Bangalore, Karnataka 560001'
    });
    await owner.save();
    console.log('Created owner');

    // Create hostels
    const hostels = [
      {
        name: 'Green Valley Hostel',
        address: '456 Brigade Road, Bangalore, Karnataka 560001',
        ownerId: owner._id,
        totalRooms: 0,
        isActive: true
      },
      {
        name: 'Sunrise Boys Hostel',
        address: '789 Indira Nagar, Bangalore, Karnataka 560038',
        ownerId: owner._id,
        totalRooms: 0,
        isActive: true
      }
    ];

    const createdHostels = [];
    for (const hostelData of hostels) {
      const hostel = new Hostel(hostelData);
      await hostel.save();
      createdHostels.push(hostel);
    }
    console.log('Created hostels');

    // Create rooms for Green Valley Hostel
    const rooms = [
      {
        roomNumber: '101',
        hostelId: createdHostels[0]._id,
        capacity: 2,
        rentAmount: 8000,
        isAC: false,
        bathroomAttached: true
      },
      {
        roomNumber: '102',
        hostelId: createdHostels[0]._id,
        capacity: 3,
        rentAmount: 12000,
        isAC: false,
        bathroomAttached: true
      },
      {
        roomNumber: '103',
        hostelId: createdHostels[0]._id,
        capacity: 1,
        rentAmount: 6000,
        isAC: true,
        bathroomAttached: true
      },
      {
        roomNumber: '201',
        hostelId: createdHostels[0]._id,
        capacity: 2,
        rentAmount: 9000,
        isAC: true,
        bathroomAttached: true
      },
      {
        roomNumber: '301',
        hostelId: createdHostels[1]._id,
        capacity: 2,
        rentAmount: 7500,
        isAC: false,
        bathroomAttached: false
      },
      {
        roomNumber: '302',
        hostelId: createdHostels[1]._id,
        capacity: 3,
        rentAmount: 11000,
        isAC: false,
        bathroomAttached: true
      }
    ];

    const createdRooms = [];
    for (const roomData of rooms) {
      const room = new Room(roomData);
      await room.save();
      createdRooms.push(room);
    }
    
    // Update hostel room counts
    await Hostel.findByIdAndUpdate(createdHostels[0]._id, { totalRooms: 4 });
    await Hostel.findByIdAndUpdate(createdHostels[1]._id, { totalRooms: 2 });
    
    console.log('Created rooms');

    // Create tenant users with Indian names and details
    const tenantPassword = await hashPassword('tenant123');
    const tenants = [
      {
        email: 'arjun.reddy@email.com',
        password: tenantPassword,
        firstName: 'Arjun',
        lastName: 'Reddy',
        phone: '+919876543212',
        tenantId: 'T001',
        fatherName: 'Ramesh Reddy',
        dateOfBirth: '2000-05-15',
        whatsappNumber: '+919876543212',
        permanentAddress: '123 Park Street, Hyderabad, Telangana 500001',
        city: 'Hyderabad',
        state: 'Telangana',
        aadharNumber: '1234 5678 9012',
        occupation: 'Student',
        collegeCompanyName: 'IIT Bangalore',
        officeAddress: 'IIT Bangalore Campus, Bangalore',
        expectedDurationStay: '4 years',
        emergencyContactName: 'Ramesh Reddy',
        emergencyContactNumber: '+919876543220',
        emergencyContactRelation: 'Father',
        role: 'tenant',
        isActive: true
      },
      {
        email: 'priya.patel@email.com',
        password: tenantPassword,
        firstName: 'Priya',
        lastName: 'Patel',
        phone: '+919876543213',
        tenantId: 'T002',
        fatherName: 'Mahesh Patel',
        dateOfBirth: '2001-08-20',
        whatsappNumber: '+919876543213',
        permanentAddress: '456 Gandhi Road, Ahmedabad, Gujarat 380001',
        city: 'Ahmedabad',
        state: 'Gujarat',
        aadharNumber: '2345 6789 0123',
        occupation: 'Student',
        collegeCompanyName: 'NIT Bangalore',
        officeAddress: 'NIT Bangalore Campus, Bangalore',
        expectedDurationStay: '3 years',
        emergencyContactName: 'Mahesh Patel',
        emergencyContactNumber: '+919876543221',
        emergencyContactRelation: 'Father',
        role: 'tenant',
        isActive: true
      },
      {
        email: 'rahul.sharma@email.com',
        password: tenantPassword,
        firstName: 'Rahul',
        lastName: 'Sharma',
        phone: '+919876543214',
        tenantId: 'T003',
        fatherName: 'Vikash Sharma',
        dateOfBirth: '1999-12-10',
        whatsappNumber: '+919876543214',
        permanentAddress: '789 Sector 5, Noida, Uttar Pradesh 201301',
        city: 'Noida',
        state: 'Uttar Pradesh',
        aadharNumber: '3456 7890 1234',
        occupation: 'Employee',
        collegeCompanyName: 'Tech Solutions Pvt Ltd',
        officeAddress: 'IT Park, Whitefield, Bangalore',
        expectedDurationStay: '2 years',
        emergencyContactName: 'Vikash Sharma',
        emergencyContactNumber: '+919876543222',
        emergencyContactRelation: 'Father',
        role: 'tenant',
        isActive: true
      },
      {
        email: 'kavya.nair@email.com',
        password: tenantPassword,
        firstName: 'Kavya',
        lastName: 'Nair',
        phone: '+919876543215',
        tenantId: 'T004',
        fatherName: 'Suresh Nair',
        dateOfBirth: '2002-03-25',
        whatsappNumber: '+919876543215',
        permanentAddress: '321 MG Road, Kochi, Kerala 682001',
        city: 'Kochi',
        state: 'Kerala',
        aadharNumber: '4567 8901 2345',
        occupation: 'Student',
        collegeCompanyName: 'Bangalore University',
        officeAddress: 'Bangalore University Campus, Bangalore',
        expectedDurationStay: '3 years',
        emergencyContactName: 'Suresh Nair',
        emergencyContactNumber: '+919876543223',
        emergencyContactRelation: 'Father',
        role: 'tenant',
        isActive: true
      },
      {
        email: 'suresh.kumar@email.com',
        password: tenantPassword,
        firstName: 'Suresh',
        lastName: 'Kumar',
        phone: '+919876543216',
        tenantId: 'T005',
        fatherName: 'Rajesh Kumar',
        dateOfBirth: '2000-07-18',
        whatsappNumber: '+919876543216',
        permanentAddress: '654 Nehru Street, Chennai, Tamil Nadu 600001',
        city: 'Chennai',
        state: 'Tamil Nadu',
        aadharNumber: '5678 9012 3456',
        occupation: 'Student',
        collegeCompanyName: 'VIT Bangalore',
        officeAddress: 'VIT Bangalore Campus, Bangalore',
        expectedDurationStay: '4 years',
        emergencyContactName: 'Rajesh Kumar',
        emergencyContactNumber: '+919876543224',
        emergencyContactRelation: 'Father',
        role: 'tenant',
        isActive: true
      },
      {
        email: 'divya.singh@email.com',
        password: tenantPassword,
        firstName: 'Divya',
        lastName: 'Singh',
        phone: '+919876543217',
        tenantId: 'T006',
        fatherName: 'Amit Singh',
        dateOfBirth: '2001-11-05',
        whatsappNumber: '+919876543217',
        permanentAddress: '987 MG Road, Jaipur, Rajasthan 302001',
        city: 'Jaipur',
        state: 'Rajasthan',
        aadharNumber: '6789 0123 4567',
        occupation: 'Student',
        collegeCompanyName: 'Bangalore Institute of Technology',
        officeAddress: 'BIT Campus, Bangalore',
        expectedDurationStay: '3 years',
        emergencyContactName: 'Amit Singh',
        emergencyContactNumber: '+919876543225',
        emergencyContactRelation: 'Father',
        role: 'tenant',
        isActive: true
      },
      {
        email: 'mohit.gupta@email.com',
        password: tenantPassword,
        firstName: 'Mohit',
        lastName: 'Gupta',
        phone: '+919876543218',
        tenantId: 'T007',
        fatherName: 'Sunil Gupta',
        dateOfBirth: '1999-09-30',
        whatsappNumber: '+919876543218',
        permanentAddress: '147 Ring Road, Delhi, Delhi 110001',
        city: 'Delhi',
        state: 'Delhi',
        aadharNumber: '7890 1234 5678',
        occupation: 'Employee',
        collegeCompanyName: 'Infosys Technologies',
        officeAddress: 'Infosys Campus, Electronic City, Bangalore',
        expectedDurationStay: '2 years',
        emergencyContactName: 'Sunil Gupta',
        emergencyContactNumber: '+919876543226',
        emergencyContactRelation: 'Father',
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
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const startOfCurrentYear = new Date(currentYear, 0, 1);
    
    const tenancies = [
      {
        roomId: createdRooms[0]._id, // Room 101 (2 capacity)
        tenantId: createdTenants[0]._id, // Arjun
        startDate: new Date(currentYear, currentMonth - 2, 1), // 2 months ago
        tenantShare: 4000, // Half of 8000
        isActive: true
      },
      {
        roomId: createdRooms[0]._id, // Room 101
        tenantId: createdTenants[1]._id, // Priya
        startDate: new Date(currentYear, currentMonth - 1, 15), // 1 month ago
        tenantShare: 4000, // Half of 8000
        isActive: true
      },
      {
        roomId: createdRooms[1]._id, // Room 102 (3 capacity)
        tenantId: createdTenants[2]._id, // Rahul
        startDate: new Date(currentYear, currentMonth - 3, 1), // 3 months ago
        tenantShare: 4000, // One third of 12000
        isActive: true
      },
      {
        roomId: createdRooms[1]._id, // Room 102
        tenantId: createdTenants[3]._id, // Kavya
        startDate: new Date(currentYear, currentMonth - 2, 10), // 2 months ago
        tenantShare: 4000, // One third of 12000
        isActive: true
      },
      {
        roomId: createdRooms[1]._id, // Room 102
        tenantId: createdTenants[4]._id, // Suresh
        startDate: new Date(currentYear, currentMonth - 1, 5), // 1 month ago
        tenantShare: 4000, // One third of 12000
        isActive: true
      },
      {
        roomId: createdRooms[2]._id, // Room 103 (1 capacity - single)
        tenantId: createdTenants[5]._id, // Divya
        startDate: new Date(currentYear, currentMonth - 4, 1), // 4 months ago
        tenantShare: 6000, // Full amount
        isActive: true
      },
      {
        roomId: createdRooms[5]._id, // Room 302 (3 capacity) - Sunrise Hostel
        tenantId: createdTenants[6]._id, // Mohit
        startDate: new Date(currentYear, currentMonth - 1, 1), // 1 month ago
        tenantShare: 3667, // One third of 11000
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
        hostelId: createdHostels[0]._id,
        categoryId: createdCategories[0]._id, // Maintenance
        amount: 5000,
        description: 'Plumbing repair in room 101',
        expenseDate: new Date(currentYear, currentMonth - 2, 10)
      },
      {
        hostelId: createdHostels[0]._id,
        categoryId: createdCategories[1]._id, // Utilities
        amount: 12000,
        description: 'Monthly electricity bill',
        expenseDate: new Date(currentYear, currentMonth - 1, 5)
      },
      {
        hostelId: createdHostels[0]._id,
        categoryId: createdCategories[2]._id, // Cleaning
        amount: 3000,
        description: 'Monthly cleaning supplies',
        expenseDate: new Date(currentYear, currentMonth - 1, 1)
      },
      {
        hostelId: createdHostels[1]._id,
        categoryId: createdCategories[1]._id, // Utilities
        amount: 8000,
        description: 'Monthly electricity and water bill',
        expenseDate: new Date(currentYear, currentMonth - 1, 3)
      },
      {
        hostelId: createdHostels[0]._id,
        categoryId: createdCategories[0]._id, // Maintenance
        amount: 3500,
        description: 'AC servicing for room 103',
        expenseDate: new Date(currentYear, currentMonth - 1, 15)
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
    console.log('Tenant Users: 7 tenants created with Indian details / tenant123');
    console.log('Hostels: Green Valley Hostel (4 rooms), Sunrise Boys Hostel (2 rooms)');
    console.log('Rooms: Multiple rooms with varying capacities and amenities');
    console.log(`Rooms: 101 (2 tenants), 102 (3 tenants), 103 (1 tenant), 201 (0 tenants), 301 (0 tenants), 302 (1 tenant)`);
    console.log('Monthly rents created for last 4 months');
    console.log('Sample bills and expenses created');
    console.log('Inventory items and room assignments created');
    console.log('\nCurrency: All amounts are in Indian Rupees (₹)');
    console.log('\n✅ Seed data generation completed successfully!');

  } catch (error) {
    console.error('Seed data error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

seedData();
