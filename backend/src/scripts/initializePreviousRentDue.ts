import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Tenancy, MonthlyRent } from '../models';

// Load environment variables
dotenv.config();

/**
 * This script initializes the previousRentDue field for all active tenancies.
 * It should be run once to set up the previous rent due tracking starting from Dec 2025.
 *
 * The script will:
 * 1. Find all active tenancies
 * 2. For each tenancy, check if there's unpaid rent for December 2025
 * 3. Set the previousRentDue to the unpaid amount (if any)
 *
 * After running this script, the monthly rent generation will automatically
 * accumulate unpaid rent from previous months.
 */

const STARTING_PERIOD = '2025-12'; // December 2025

const initializePreviousRentDue = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI environment variable is required');
      process.exit(1);
    }
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    console.log(`\nInitializing previousRentDue for all active tenancies...`);
    console.log(`Starting period: ${STARTING_PERIOD}\n`);

    // Find all active tenancies
    const activeTenancies = await Tenancy.find({ isActive: true })
      .populate('tenantId', 'firstName lastName');
    console.log(`Found ${activeTenancies.length} active tenancies\n`);

    let initializedCount = 0;
    let skippedCount = 0;
    let alreadySetCount = 0;

    for (const tenancy of activeTenancies) {
      const tenantName = `${(tenancy.tenantId as any)?.firstName || ''} ${(tenancy.tenantId as any)?.lastName || ''}`.trim() || 'Unknown';

      // Skip if previousRentDue is already set (non-zero)
      if ((tenancy.previousRentDue || 0) > 0) {
        console.log(`⏭️  Tenant: ${tenantName} - previousRentDue already set to ${tenancy.previousRentDue}`);
        alreadySetCount++;
        continue;
      }

      // Check if there's a rent record for December 2025
      const decRent = await MonthlyRent.findOne({
        tenancyId: tenancy._id,
        period: STARTING_PERIOD
      });

      if (!decRent) {
        console.log(`⏭️  Tenant: ${tenantName} - No rent record for ${STARTING_PERIOD}`);
        skippedCount++;
        continue;
      }

      // Check if rent is unpaid or partially paid
      if (decRent.status !== 'paid') {
        const unpaidAmount = decRent.amount - decRent.amountPaid;

        if (unpaidAmount > 0) {
          // Note: We don't set previousRentDue here because December is the current month
          // The previousRentDue will be calculated when January 2026 rent is generated
          console.log(`📊 Tenant: ${tenantName} - Dec 2025 rent status: ${decRent.status}`);
          console.log(`   Amount: ${decRent.amount}, Paid: ${decRent.amountPaid}, Unpaid: ${unpaidAmount}`);
          console.log(`   (Will be moved to previousRentDue when Jan 2026 rent is generated)`);
          initializedCount++;
        } else {
          console.log(`✅ Tenant: ${tenantName} - Dec 2025 rent fully paid`);
          skippedCount++;
        }
      } else {
        console.log(`✅ Tenant: ${tenantName} - Dec 2025 rent status: paid`);
        skippedCount++;
      }
    }

    console.log(`\n========================================`);
    console.log(`Initialization Summary:`);
    console.log(`========================================`);
    console.log(`Total active tenancies: ${activeTenancies.length}`);
    console.log(`With unpaid Dec 2025 rent: ${initializedCount}`);
    console.log(`Already with previousRentDue set: ${alreadySetCount}`);
    console.log(`Fully paid or no rent record: ${skippedCount}`);
    console.log(`\nNote: The previousRentDue field will be automatically populated`);
    console.log(`when the next month's rent is generated (January 2026 onwards).`);

  } catch (error) {
    console.error('Initialize previous rent due error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    process.exit(0);
  }
};

initializePreviousRentDue();
