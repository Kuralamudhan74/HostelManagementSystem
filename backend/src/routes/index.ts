import { Router } from 'express';
import {
  login,
  register,
  refreshToken,
  getProfile,
  updateProfile,
  logout,
  changePassword,
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema
} from '../controllers/authController';
import { 
  createHostel,
  getHostels,
  deleteHostel,
  createRoom,
  getRooms,
  addTenantToRoom,
  endTenancy,
  getTenants,
  recordPayment,
  getPayments,
  suggestPaymentAllocations,
  createExpense,
  getExpenses,
  getExpenseCategories,
  createExpenseCategory,
  createOrUpdateEBBill,
  getRoomEBBills,
  updateRentPaymentStatus,
  getDashboardStats,
  createHostelSchema,
  createRoomSchema,
  addTenantToRoomSchema,
  recordPaymentSchema,
  createExpenseSchema
} from '../controllers/adminController';
import {
  uploadAttachment,
  downloadAttachment,
  getAttachmentInfo,
  deleteAttachment,
  getMyAttachments,
  uploadAttachmentSchema
} from '../controllers/attachmentController';
import { importTenantsFromCSV } from '../controllers/importController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { requireApiKey } from '../middleware/apiKey';
import { validate } from '../middleware/validation';
import { upload } from '../controllers/attachmentController';
import multer from 'multer';

const router = Router();

// Multer configuration for CSV upload
const csvUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Authentication routes (for frontend state management only)
router.post('/auth/login', validate(loginSchema), login);
router.post('/auth/register', requireApiKey, validate(registerSchema), register);
router.post('/auth/logout', logout);

// User profile routes
router.get('/me', requireApiKey, getProfile);
router.patch('/me', requireApiKey, updateProfile);
router.post('/me/change-password', requireApiKey, validate(changePasswordSchema), changePassword);

// Admin routes
router.get('/admin/dashboard/stats', requireApiKey, getDashboardStats);
router.get('/admin/financial-overview', requireApiKey, async (req, res, next) => {
  const { getFinancialOverview } = await import('../controllers/adminController');
  return getFinancialOverview(req as any, res);
});
router.post('/admin/hostels', requireApiKey, validate(createHostelSchema), createHostel);
router.get('/admin/hostels', requireApiKey, getHostels);
router.delete('/admin/hostels/:hostelId', requireApiKey, async (req, res, next) => {
  const { deleteHostel } = await import('../controllers/adminController');
  return deleteHostel(req as any, res);
});

router.post('/admin/rooms', requireApiKey, validate(createRoomSchema), createRoom);
router.get('/admin/rooms', requireApiKey, getRooms);
router.delete('/admin/rooms/:roomId', requireApiKey, async (req, res, next) => {
  const { deleteRoom } = await import('../controllers/adminController');
  return deleteRoom(req as any, res);
});

router.post('/admin/rooms/:roomId/tenants', requireApiKey, validate(addTenantToRoomSchema), addTenantToRoom);
router.patch('/admin/tenancies/:tenancyId/end', requireApiKey, async (req, res, next) => {
  const { endTenancy } = await import('../controllers/adminController');
  return endTenancy(req as any, res);
});
router.post('/admin/tenants', requireApiKey, async (req, res, next) => {
  const { createTenant } = await import('../controllers/adminController');
  return createTenant(req as any, res);
});
router.get('/admin/tenants', requireApiKey, getTenants);
router.get('/admin/tenants/:tenantId/profile', requireApiKey, async (req, res, next) => {
  const { getTenantProfile } = await import('../controllers/adminController');
  return getTenantProfile(req as any, res);
});
router.patch('/admin/tenants/:tenantId/profile', requireApiKey, async (req, res, next) => {
  const { updateTenantProfile } = await import('../controllers/adminController');
  return updateTenantProfile(req as any, res);
});
router.patch('/admin/tenants/:tenantId/status', requireApiKey, async (req, res, next) => {
  const { updateTenantStatus } = await import('../controllers/adminController');
  return updateTenantStatus(req as any, res);
});
router.delete('/admin/tenants/:tenantId', requireApiKey, async (req, res, next) => {
  const { deleteTenant } = await import('../controllers/adminController');
  return deleteTenant(req as any, res);
});
router.delete('/admin/tenants/:tenantId/permanent', requireApiKey, async (req, res, next) => {
  const { permanentlyDeleteTenant } = await import('../controllers/adminController');
  return permanentlyDeleteTenant(req as any, res);
});

// Tenant CSV import route
router.post('/admin/tenants/import-csv', requireApiKey, csvUpload.single('file'), importTenantsFromCSV);

router.post('/admin/payments', requireApiKey, validate(recordPaymentSchema), recordPayment);
router.get('/admin/payments', requireApiKey, getPayments);
router.get('/admin/payments/suggest', requireApiKey, suggestPaymentAllocations);

router.post('/admin/expenses', requireApiKey, validate(createExpenseSchema), createExpense);
router.get('/admin/expenses', requireApiKey, getExpenses);
router.get('/admin/expense-categories', requireApiKey, getExpenseCategories);
router.post('/admin/expense-categories', requireApiKey, createExpenseCategory);

// EB Bill routes
router.post('/admin/eb-bills', requireApiKey, createOrUpdateEBBill);
router.get('/admin/eb-bills', requireApiKey, getRoomEBBills);

// Rent status routes
router.patch('/admin/rents/:rentId/payment-status', requireApiKey, updateRentPaymentStatus);

// Attachment routes
router.post('/attachments', requireApiKey, upload.single('file'), validate(uploadAttachmentSchema), uploadAttachment);
router.get('/attachments/:id', requireApiKey, getAttachmentInfo);
router.get('/attachments/:id/download', requireApiKey, downloadAttachment);
router.delete('/attachments/:id', requireApiKey, deleteAttachment);
router.get('/me/attachments', requireApiKey, getMyAttachments);

export default router;
