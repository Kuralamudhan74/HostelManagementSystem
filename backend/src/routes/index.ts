import { Router } from 'express';
import { 
  login, 
  register, 
  refreshToken, 
  getProfile, 
  updateProfile, 
  logout,
  loginSchema,
  registerSchema,
  refreshTokenSchema
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
  getMyDues,
  getMyTenancy,
  getMyPaymentHistory,
  getMyRentHistory,
  getMyBillHistory,
  getMyDashboard
} from '../controllers/tenantController';
import { 
  uploadAttachment,
  downloadAttachment,
  getAttachmentInfo,
  deleteAttachment,
  getMyAttachments,
  uploadAttachmentSchema
} from '../controllers/attachmentController';
import { authenticate, requireAdmin, requireTenant } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { upload } from '../controllers/attachmentController';

const router = Router();

// Authentication routes
router.post('/auth/login', validate(loginSchema), login);
router.post('/auth/register', authenticate, requireAdmin, validate(registerSchema), register);
router.post('/auth/refresh', validate(refreshTokenSchema), refreshToken);
router.post('/auth/logout', authenticate, logout);

// User profile routes
router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);

// Admin routes
router.get('/admin/dashboard/stats', authenticate, requireAdmin, getDashboardStats);
router.post('/admin/hostels', authenticate, requireAdmin, validate(createHostelSchema), createHostel);
router.get('/admin/hostels', authenticate, requireAdmin, getHostels);
router.delete('/admin/hostels/:hostelId', authenticate, requireAdmin, async (req, res, next) => {
  const { deleteHostel } = await import('../controllers/adminController');
  return deleteHostel(req as any, res);
});

router.post('/admin/rooms', authenticate, requireAdmin, validate(createRoomSchema), createRoom);
router.get('/admin/rooms', authenticate, requireAdmin, getRooms);
router.delete('/admin/rooms/:roomId', authenticate, requireAdmin, async (req, res, next) => {
  const { deleteRoom } = await import('../controllers/adminController');
  return deleteRoom(req as any, res);
});

router.post('/admin/rooms/:roomId/tenants', authenticate, requireAdmin, validate(addTenantToRoomSchema), addTenantToRoom);
router.patch('/admin/tenancies/:tenancyId/end', authenticate, requireAdmin, async (req, res, next) => {
  const { endTenancy } = await import('../controllers/adminController');
  return endTenancy(req as any, res);
});
router.get('/admin/tenants', authenticate, requireAdmin, getTenants);
router.get('/admin/tenants/:tenantId/profile', authenticate, requireAdmin, async (req, res, next) => {
  const { getTenantProfile } = await import('../controllers/adminController');
  return getTenantProfile(req as any, res);
});
router.patch('/admin/tenants/:tenantId/status', authenticate, requireAdmin, async (req, res, next) => {
  const { updateTenantStatus } = await import('../controllers/adminController');
  return updateTenantStatus(req as any, res);
});

router.post('/admin/payments', authenticate, requireAdmin, validate(recordPaymentSchema), recordPayment);
router.get('/admin/payments', authenticate, requireAdmin, getPayments);
router.get('/admin/payments/suggest', authenticate, requireAdmin, suggestPaymentAllocations);

router.post('/admin/expenses', authenticate, requireAdmin, validate(createExpenseSchema), createExpense);
router.get('/admin/expenses', authenticate, requireAdmin, getExpenses);
router.get('/admin/expense-categories', authenticate, requireAdmin, getExpenseCategories);
router.post('/admin/expense-categories', authenticate, requireAdmin, createExpenseCategory);

// EB Bill routes
router.post('/admin/eb-bills', authenticate, requireAdmin, createOrUpdateEBBill);
router.get('/admin/eb-bills', authenticate, requireAdmin, getRoomEBBills);

// Rent status routes
router.patch('/admin/rents/:rentId/payment-status', authenticate, requireAdmin, updateRentPaymentStatus);

// Tenant routes
router.get('/me/dues', authenticate, requireTenant, getMyDues);
router.get('/me/tenancy', authenticate, requireTenant, getMyTenancy);
router.get('/me/payments', authenticate, requireTenant, getMyPaymentHistory);
router.get('/me/rents', authenticate, requireTenant, getMyRentHistory);
router.get('/me/bills', authenticate, requireTenant, getMyBillHistory);
router.get('/me/dashboard', authenticate, requireTenant, getMyDashboard);

// Attachment routes
router.post('/attachments', authenticate, upload.single('file'), validate(uploadAttachmentSchema), uploadAttachment);
router.get('/attachments/:id', authenticate, getAttachmentInfo);
router.get('/attachments/:id/download', authenticate, downloadAttachment);
router.delete('/attachments/:id', authenticate, deleteAttachment);
router.get('/me/attachments', authenticate, getMyAttachments);

export default router;
