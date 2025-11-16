import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  User,
  Owner,
  Hostel,
  Room,
  RoomEBBill,
  Tenancy,
  MonthlyRent,
  Bill,
  Payment,
  PaymentAllocation,
  ExpenseCategory,
  Expense,
  InventoryItem,
  RoomInventory,
  AuditLog,
  Attachment
} from '../models';
import { hashPassword } from '../middleware/auth';

// Load environment variables
dotenv.config();

const seedData = async () => {
  try {
    // SECURITY: Prevent seed script from running in production
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ FATAL ERROR: Cannot run seed script in production environment!');
      console.error('📌 This script would delete all production data.');
      console.error('💡 For production, create admin users manually or use a separate initialization script.');
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel-management';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // ⚠️  CLEAR ALL EXISTING DATA - This will wipe the entire database!
    console.log('\n🗑️  Clearing all existing data from database...');

    await PaymentAllocation.deleteMany({});
    console.log('   ✓ Cleared payment allocations');

    await Payment.deleteMany({});
    console.log('   ✓ Cleared payments');

    await Bill.deleteMany({});
    console.log('   ✓ Cleared bills');

    await MonthlyRent.deleteMany({});
    console.log('   ✓ Cleared monthly rents');

    await RoomEBBill.deleteMany({});
    console.log('   ✓ Cleared room EB bills');

    await Tenancy.deleteMany({});
    console.log('   ✓ Cleared tenancies');

    await RoomInventory.deleteMany({});
    console.log('   ✓ Cleared room inventory');

    await InventoryItem.deleteMany({});
    console.log('   ✓ Cleared inventory items');

    await Room.deleteMany({});
    console.log('   ✓ Cleared rooms');

    await Hostel.deleteMany({});
    console.log('   ✓ Cleared hostels');

    await Owner.deleteMany({});
    console.log('   ✓ Cleared owners');

    await Expense.deleteMany({});
    console.log('   ✓ Cleared expenses');

    await ExpenseCategory.deleteMany({});
    console.log('   ✓ Cleared expense categories');

    await Attachment.deleteMany({});
    console.log('   ✓ Cleared attachments');

    await AuditLog.deleteMany({});
    console.log('   ✓ Cleared audit logs');

    await User.deleteMany({});
    console.log('   ✓ Cleared users');

    console.log('✅ All collections cleared successfully!\n');

    // Create admin users (for production initial setup)
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
    console.log('✅ Created admin user: admin@hostel.com');

    // Create second admin user
    const vasuPassword = await hashPassword('vasu123');
    const vasuAdmin = new User({
      email: 'vasu@hostel.com',
      password: vasuPassword,
      firstName: 'Vasu',
      lastName: 'Admin',
      phone: '+919876543211',
      role: 'admin',
      isActive: true
    });
    await vasuAdmin.save();
    console.log('✅ Created admin user: vasu@hostel.com');

    console.log('\n========================================');
    console.log('✅ SEED DATA COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log('');
    console.log('🗑️  Database Status:');
    console.log('   - ALL previous data has been deleted');
    console.log('   - Database is now clean with only admin credentials');
    console.log('');
    console.log('📧 Admin Login Credentials:');
    console.log('   1. Email: admin@hostel.com | Password: admin123');
    console.log('   2. Email: vasu@hostel.com  | Password: vasu123');
    console.log('');
    console.log('⚠️  SECURITY WARNING:');
    console.log('   - Change these passwords immediately after first login!');
    console.log('   - Never run this script in production environment!');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Login with admin credentials');
    console.log('   2. Add Hostels and Rooms');
    console.log('   3. Import Tenants via CSV or add manually');
    console.log('   4. Manage Payments & Expenses');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Seed data error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
};

seedData();
