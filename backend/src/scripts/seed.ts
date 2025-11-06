import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models';
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

    // Clear existing users only
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

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
    console.log('📧 Admin Credentials:');
    console.log('   1. Email: admin@hostel.com | Password: admin123');
    console.log('   2. Email: vasu@hostel.com  | Password: vasu123');
    console.log('');
    console.log('⚠️  IMPORTANT: Change these passwords immediately after first login!');
    console.log('');
    console.log('💡 You can now login and start adding:');
    console.log('   - Hostels');
    console.log('   - Rooms');
    console.log('   - Tenants');
    console.log('   - Payments & Expenses');
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
