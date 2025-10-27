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
  createRoom,
  getRooms,
  addTenantToRoom,
  getTenants,
  recordPayment,
  getPayments,
  suggestPaymentAllocations,
  createExpense,
  getExpenses,
  getExpenseCategories,
  createExpenseCategory,
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
router.post('/admin/hostels', authenticate, requireAdmin, validate(createHostelSchema), createHostel);
router.get('/admin/hostels', authenticate, requireAdmin, getHostels);

router.post('/admin/rooms', authenticate, requireAdmin, validate(createRoomSchema), createRoom);
router.get('/admin/rooms', authenticate, requireAdmin, getRooms);

router.post('/admin/rooms/:roomId/tenants', authenticate, requireAdmin, validate(addTenantToRoomSchema), addTenantToRoom);
router.patch('/admin/tenancies/:tenancyId/end', authenticate, requireAdmin, async (req, res, next) => {
  const { endTenancy } = await import('../controllers/adminController');
  return endTenancy(req as any, res);
});
router.get('/admin/tenants', authenticate, requireAdmin, getTenants);

router.post('/admin/payments', authenticate, requireAdmin, validate(recordPaymentSchema), recordPayment);
router.get('/admin/payments', authenticate, requireAdmin, getPayments);
router.get('/admin/payments/suggest', authenticate, requireAdmin, suggestPaymentAllocations);

router.post('/admin/expenses', authenticate, requireAdmin, validate(createExpenseSchema), createExpense);
router.get('/admin/expenses', authenticate, requireAdmin, getExpenses);
router.get('/admin/expense-categories', authenticate, requireAdmin, getExpenseCategories);
router.post('/admin/expense-categories', authenticate, requireAdmin, createExpenseCategory);

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
