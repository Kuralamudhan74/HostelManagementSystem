import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { User } from '../models';
import { hashPassword } from '../middleware/auth';
import { logAction } from '../utils/auditLogger';
import csv from 'csv-parser';
import { Readable } from 'stream';

// Field mapping from Google Forms to User model
// Based on actual form columns
const FIELD_MAPPING: Record<string, string> = {
  'Name': 'fullName', // We'll split this into firstName and lastName
  'Father Name': 'fatherName',
  'Date of Birth': 'dateOfBirth',
  'Mobile Number': 'phone',
  'WhatsApp Number': 'whatsappNumber',
  'Permanent Address (native)': 'permanentAddress',
  'City & State': 'cityState', // We'll split this into city and state
  'Aadhar Number': 'aadharNumber',
  'Occupation': 'occupation',
  'Name of College/Company/Institute (if you are searching for job/studying, pls put studying)': 'collegeCompanyName',
  'Office/College/Institute Address (city)': 'officeAddress',
  'Expected Duration of Stay (for our reference)': 'expectedDurationStay',
  'Emergency Contact': 'emergencyContactNumber', // Now separate phone field
  'Emergency Contact Name': 'emergencyContactName' // Now separate name field
};

interface ImportRow {
  [key: string]: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    name?: string;
    reason: string;
  }>;
  createdTenants: Array<{
    tenantId: string;
    firstName: string;
    lastName: string;
  }>;
}

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (10 digits, optional +91 prefix)
const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
};

// Validate Aadhar number (12 digits)
const isValidAadhar = (aadhar: string): boolean => {
  const aadharRegex = /^\d{12}$/;
  return aadharRegex.test(aadhar.replace(/\s+/g, ''));
};

// Parse date in multiple formats (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
const parseDate = (dateStr: string): Date | null => {
  const trimmed = dateStr.trim();

  // Try YYYY-MM-DD format
  let date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try DD/MM/YYYY or MM/DD/YYYY
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    // Assume DD/MM/YYYY if day > 12
    const num1 = parseInt(parts[0]);
    const num2 = parseInt(parts[1]);
    const year = parseInt(parts[2]);

    if (num1 > 12) {
      // DD/MM/YYYY
      date = new Date(year, num2 - 1, num1);
    } else {
      // MM/DD/YYYY
      date = new Date(year, num1 - 1, num2);
    }

    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
};

// Generate unique incremental tenant ID
const generateNextTenantId = async (): Promise<number> => {
  // Find all tenants with numeric tenantIds
  const allTenants = await User.find({ 
    role: 'tenant',
    tenantId: { $exists: true, $ne: null }
  }).select('tenantId');

  let maxId = 0;
  for (const tenant of allTenants) {
    if (tenant.tenantId) {
      const id = parseInt(tenant.tenantId, 10);
      if (!isNaN(id) && id > maxId) {
        maxId = id;
      }
    }
  }

  return maxId + 1; // Start from 1 if no tenants exist, otherwise increment from max
};

// Clean and normalize field value
const cleanValue = (value: string): string => {
  return value ? value.trim() : '';
};

// Map CSV row to User data
const mapRowToUser = (row: ImportRow): any => {
  const userData: any = {
    role: 'tenant',
    isActive: true
  };

  for (const [csvField, value] of Object.entries(row)) {
    const mappedField = FIELD_MAPPING[csvField];
    if (mappedField && value) {
      const cleanedValue = cleanValue(value);

      // Special handling for different field types
      if (mappedField === 'dateOfBirth') {
        const date = parseDate(cleanedValue);
        if (date) {
          userData[mappedField] = date;
        }
      } else if (mappedField === 'fullName') {
        // Split full name into first and last name
        const nameParts = cleanedValue.split(' ').filter(part => part.trim() !== '');
        userData.firstName = nameParts[0] || '';
        // Only set lastName if there are multiple parts, otherwise leave it empty
        userData.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      } else if (mappedField === 'cityState') {
        // Split "City & State" or "City TN" into city and state
        const parts = cleanedValue.split(/\s+/);
        if (parts.length >= 2) {
          // Last part is state, rest is city
          userData.state = parts[parts.length - 1];
          userData.city = parts.slice(0, -1).join(' ');
        } else {
          userData.city = cleanedValue;
          userData.state = '';
        }
      } else {
        userData[mappedField] = cleanedValue;
      }
    }
  }

  // Note: Email and password are not generated for tenants
  // They are not needed since tenants don't log in via the system

  // Set default emergency contact relation if not provided
  if (!userData.emergencyContactRelation && userData.emergencyContactName) {
    userData.emergencyContactRelation = 'Family';
  }

  return userData;
};

// Validate tenant data
const validateTenantData = (data: any, rowNum: number): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required fields based on your form
  if (!data.firstName) errors.push('Name is required');
  if (!data.fatherName) errors.push('Father name is required');
  if (!data.dateOfBirth) errors.push('Date of birth is required');
  if (!data.phone) errors.push('Mobile number is required');
  if (!data.whatsappNumber) errors.push('WhatsApp number is required');
  if (!data.permanentAddress) errors.push('Permanent address is required');
  if (!data.city) errors.push('City is required');
  if (!data.aadharNumber) errors.push('Aadhar number is required');
  if (!data.occupation) errors.push('Occupation is required');
  if (!data.collegeCompanyName) errors.push('College/Company/Institute name is required');
  if (!data.emergencyContactName) errors.push('Emergency contact is required');

  // Email and password are not required for tenants (no login functionality)

  // Expected duration is optional (not checked)

  // Format validations
  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Invalid mobile number format (must be 10 digits)');
  }

  if (data.whatsappNumber && !isValidPhone(data.whatsappNumber)) {
    errors.push('Invalid WhatsApp number format (must be 10 digits)');
  }

  if (data.aadharNumber && !isValidAadhar(data.aadharNumber)) {
    errors.push('Invalid Aadhar number format (must be 12 digits)');
  }

  if (data.emergencyContactNumber && !isValidPhone(data.emergencyContactNumber)) {
    errors.push('Invalid emergency contact phone format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// CSV Import controller
export const importTenantsFromCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const results: ImportRow[] = [];
    const importResult: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      createdTenants: []
    };

    // Parse CSV
    const buffer = req.file.buffer;
    const stream = Readable.from(buffer.toString());

    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data: ImportRow) => results.push(data))
        .on('end', () => resolve())
        .on('error', (error) => reject(error));
    });

    console.log(`Parsed ${results.length} rows from CSV`);

    // Get the starting tenant ID for this import batch
    let currentTenantId = await generateNextTenantId();

    // Process each row
    for (let i = 0; i < results.length; i++) {
      const row = results[i];
      const rowNum = i + 2; // +2 because CSV is 1-indexed and has header row

      try {
        // Map CSV fields to user data
        const userData = mapRowToUser(row);

        // Validate data
        const validation = validateTenantData(userData, rowNum);
        if (!validation.valid) {
          importResult.failed++;
          importResult.errors.push({
            row: rowNum,
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'N/A',
            reason: validation.errors.join(', ')
          });
          continue;
        }

        // Check for duplicate user by phone or Aadhar
        const existingUserByPhone = await User.findOne({ phone: userData.phone });
        const existingUserByAadhar = await User.findOne({ aadharNumber: userData.aadharNumber });

        if (existingUserByPhone || existingUserByAadhar) {
          console.log(`Skipping duplicate user: ${userData.firstName} ${userData.lastName}`);
          importResult.failed++;
          importResult.errors.push({
            row: rowNum,
            name: `${userData.firstName} ${userData.lastName}`,
            reason: 'User already exists (duplicate phone or Aadhar number)'
          });
          continue;
        }

        // Generate unique incremental tenant ID
        userData.tenantId = currentTenantId.toString();
        currentTenantId++;

        // Generate a placeholder email (required by model but not used for login)
        // Format: tenant{id}@hostel.local (not displayed or shared)
        userData.email = `tenant${userData.tenantId}@hostel.local`;

        // Generate a random password (required by model but not used for login)
        // Tenants don't have login access, so this is just a placeholder
        const placeholderPassword = `placeholder_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        const hashedPassword = await hashPassword(placeholderPassword);

        // Create user
        const newUser = new User({
          ...userData,
          password: hashedPassword
        });

        await newUser.save();

        // Log action
        await logAction(req.user, 'User', newUser._id, 'create', null, {
          tenantId: newUser.tenantId,
          role: 'tenant',
          source: 'CSV Import'
        });

        importResult.success++;
        importResult.createdTenants.push({
          tenantId: userData.tenantId,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

        console.log(`Successfully created tenant: ${userData.firstName} ${userData.lastName} (ID: ${userData.tenantId})`);
      } catch (error: any) {
        console.error(`Error processing row ${rowNum}:`, error);
        importResult.failed++;
        importResult.errors.push({
          row: rowNum,
          name: row['Name'] || 'N/A',
          reason: error.message || 'Unknown error'
        });
      }
    }

    console.log(`Import completed: ${importResult.success} success, ${importResult.failed} failed`);

    res.json({
      message: `Import completed: ${importResult.success} tenants created, ${importResult.failed} failed`,
      ...importResult
    });
  } catch (error: any) {
    console.error('CSV import error:', error);
    res.status(500).json({
      message: 'Failed to import CSV',
      error: error.message
    });
  }
};
