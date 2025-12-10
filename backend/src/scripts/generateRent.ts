import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Tenancy, MonthlyRent } from '../models';

// Load environment variables
dotenv.config();

// Helper function to get previous month in YYYY-MM format
const getPreviousMonth = (currentMonth: string): string => {
  const [year, month] = currentMonth.split('-').map(Number);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${(month - 1).toString().padStart(2, '0')}`;
};

// Starting month for previous rent due tracking (Dec 2025)
const PREVIOUS_RENT_TRACKING_START = '2025-12';

const generateMonthlyRent = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI environment variable is required');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Get current month in YYYY-MM format
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const previousMonth = getPreviousMonth(currentMonth);

    console.log(`Generating monthly rents for ${currentMonth}`);
    console.log(`Previous month: ${previousMonth}`);

    // Find all active tenancies
    const activeTenancies = await Tenancy.find({ isActive: true });
    console.log(`Found ${activeTenancies.length} active tenancies`);

    let createdCount = 0;
    let skippedCount = 0;
    let previousRentUpdatedCount = 0;

    for (const tenancy of activeTenancies) {
      // Check if rent already exists for this month
      const existingRent = await MonthlyRent.findOne({
        tenancyId: tenancy._id,
        period: currentMonth
      });

      if (existingRent) {
        console.log(`Rent already exists for tenancy ${tenancy._id} in ${currentMonth}`);
        skippedCount++;
        continue;
      }

      // Check previous month's rent and accumulate unpaid amount to previousRentDue
      // Only track from Dec 2025 onwards
      if (previousMonth >= PREVIOUS_RENT_TRACKING_START) {
        const previousRent = await MonthlyRent.findOne({
          tenancyId: tenancy._id,
          period: previousMonth
        });

        if (previousRent && previousRent.status !== 'paid') {
          // Calculate unpaid amount from previous month
          const unpaidAmount = previousRent.amount - previousRent.amountPaid;

          if (unpaidAmount > 0) {
            // Add to previousRentDue (accumulate with existing amount)
            const currentPreviousRentDue = tenancy.previousRentDue || 0;
            tenancy.previousRentDue = currentPreviousRentDue + unpaidAmount;
            await tenancy.save();

            console.log(`Added ${unpaidAmount} to previousRentDue for tenancy ${tenancy._id} (Total: ${tenancy.previousRentDue})`);
            previousRentUpdatedCount++;
          }
        }
      }

      // Create monthly rent record
      const monthlyRent = new MonthlyRent({
        tenancyId: tenancy._id,
        amount: tenancy.tenantShare || 0,
        amountPaid: 0,
        status: 'due',
        dueDate: new Date(currentMonth + '-05'), // 5th of the month
        period: currentMonth
      });

      await monthlyRent.save();
      createdCount++;
      console.log(`Created monthly rent for tenancy ${tenancy._id}`);
    }

    console.log(`\nMonthly rent generation completed:`);
    console.log(`- Created: ${createdCount} new rent records`);
    console.log(`- Skipped: ${skippedCount} existing records`);
    console.log(`- Previous rent dues updated: ${previousRentUpdatedCount} tenancies`);
    console.log(`- Period: ${currentMonth}`);

  } catch (error) {
    console.error('Generate monthly rent error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

generateMonthlyRent();
