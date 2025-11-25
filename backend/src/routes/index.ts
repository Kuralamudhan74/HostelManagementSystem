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
  changePasswordSchema
} from '../controllers/authController';
import {
  createHostel,
  getHostels,
  deleteHostel,
  createRoom,
  getRooms,
  updateRoom,
  addTenantToRoom,
  endTenancy,
  updateTenancy,
  getTenants,
  recordPayment,
  getPayments,
  deletePayment,
  suggestPaymentAllocations,
  createExpense,
  getExpenses,
  getExpenseCategories,
  createExpenseCategory,
  createOrUpdateEBBill,
  getRoomEBBills,
  updateRentPaymentStatus,
  getDashboardStats,
  updateTenantAdvance,
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

// Authentication routes
router.post('/auth/login', validate(loginSchema), login);
router.post('/auth/register', authenticate, requireAdmin, validate(registerSchema), register);
router.post('/auth/refresh', refreshToken);
router.post('/auth/logout', logout);

// User profile routes
router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);
router.post('/me/change-password', authenticate, validate(changePasswordSchema), changePassword);

// Admin routes
router.get('/admin/dashboard/stats', authenticate, requireAdmin, getDashboardStats);
router.get('/admin/financial-overview', authenticate, requireAdmin, async (req, res, next) => {
  const { getFinancialOverview } = await import('../controllers/adminController');
  return getFinancialOverview(req as any, res);
});
router.post('/admin/hostels', authenticate, requireAdmin, validate(createHostelSchema), createHostel);
router.get('/admin/hostels', authenticate, requireAdmin, getHostels);
router.delete('/admin/hostels/:hostelId', authenticate, requireAdmin, async (req, res, next) => {
  const { deleteHostel } = await import('../controllers/adminController');
  return deleteHostel(req as any, res);
});

router.post('/admin/rooms', authenticate, requireAdmin, validate(createRoomSchema), createRoom);
router.get('/admin/rooms', authenticate, requireAdmin, getRooms);
router.patch('/admin/rooms/:roomId', authenticate, requireAdmin, updateRoom);
router.delete('/admin/rooms/:roomId', authenticate, requireAdmin, async (req, res, next) => {
  const { deleteRoom } = await import('../controllers/adminController');
  return deleteRoom(req as any, res);
});

router.post('/admin/rooms/:roomId/tenants', authenticate, requireAdmin, validate(addTenantToRoomSchema), addTenantToRoom);
router.patch('/admin/tenancies/:tenancyId/end', authenticate, requireAdmin, async (req, res, next) => {
  const { endTenancy } = await import('../controllers/adminController');
  return endTenancy(req as any, res);
});
router.patch('/admin/tenancies/:tenancyId', authenticate, requireAdmin, async (req, res, next) => {
  const { updateTenancy } = await import('../controllers/adminController');
  return updateTenancy(req as any, res);
});
router.post('/admin/tenants', authenticate, requireAdmin, async (req, res, next) => {
  const { createTenant } = await import('../controllers/adminController');
  return createTenant(req as any, res);
});
router.get('/admin/tenants', authenticate, requireAdmin, getTenants);
router.get('/admin/tenants/:tenantId/profile', authenticate, requireAdmin, async (req, res, next) => {
  const { getTenantProfile } = await import('../controllers/adminController');
  return getTenantProfile(req as any, res);
});
router.patch('/admin/tenants/:tenantId/profile', authenticate, requireAdmin, async (req, res, next) => {
  const { updateTenantProfile } = await import('../controllers/adminController');
  return updateTenantProfile(req as any, res);
});
router.patch('/admin/tenants/:tenantId/advance', authenticate, requireAdmin, updateTenantAdvance);
router.patch('/admin/tenants/:tenantId/status', authenticate, requireAdmin, async (req, res, next) => {
  const { updateTenantStatus } = await import('../controllers/adminController');
  return updateTenantStatus(req as any, res);
});
router.delete('/admin/tenants/:tenantId', authenticate, requireAdmin, async (req, res, next) => {
  const { deleteTenant } = await import('../controllers/adminController');
  return deleteTenant(req as any, res);
});
router.delete('/admin/tenants/:tenantId/permanent', authenticate, requireAdmin, async (req, res, next) => {
  const { permanentlyDeleteTenant } = await import('../controllers/adminController');
  return permanentlyDeleteTenant(req as any, res);
});

// Tenant CSV import route
router.post('/admin/tenants/import-csv', authenticate, requireAdmin, csvUpload.single('file'), importTenantsFromCSV);

router.post('/admin/payments', authenticate, requireAdmin, validate(recordPaymentSchema), recordPayment);
router.get('/admin/payments', authenticate, requireAdmin, getPayments);
router.get('/admin/payments/suggest', authenticate, requireAdmin, suggestPaymentAllocations);
router.delete('/admin/payments/:paymentId', authenticate, requireAdmin, deletePayment);

router.post('/admin/expenses', authenticate, requireAdmin, validate(createExpenseSchema), createExpense);
router.get('/admin/expenses', authenticate, requireAdmin, getExpenses);
router.get('/admin/expense-categories', authenticate, requireAdmin, getExpenseCategories);
router.post('/admin/expense-categories', authenticate, requireAdmin, createExpenseCategory);

// EB Bill routes
router.post('/admin/eb-bills', authenticate, requireAdmin, createOrUpdateEBBill);
router.get('/admin/eb-bills', authenticate, requireAdmin, getRoomEBBills);

// Rent status routes
router.patch('/admin/rents/:rentId/payment-status', authenticate, requireAdmin, updateRentPaymentStatus);

// Attachment routes
router.post('/attachments', authenticate, upload.single('file'), validate(uploadAttachmentSchema), uploadAttachment);
router.get('/attachments/:id', authenticate, getAttachmentInfo);
router.get('/attachments/:id/download', authenticate, downloadAttachment);
router.delete('/attachments/:id', authenticate, deleteAttachment);
router.get('/me/attachments', authenticate, getMyAttachments);

export default router;
