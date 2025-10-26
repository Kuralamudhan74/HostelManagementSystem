import mongoose, { Document, Schema } from 'mongoose';

// User Schema
export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'tenant';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['admin', 'tenant'], required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Owner Schema
export interface IOwner extends Document {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ownerSchema = new Schema<IOwner>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String }
}, {
  timestamps: true
});

// Hostel Schema
export interface IHostel extends Document {
  _id: string;
  name: string;
  address: string;
  ownerId: mongoose.Types.ObjectId;
  totalRooms: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hostelSchema = new Schema<IHostel>({
  name: { type: String, required: true },
  address: { type: String, required: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'Owner', required: true },
  totalRooms: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Room Schema
export interface IRoom extends Document {
  _id: string;
  roomNumber: string;
  hostelId: mongoose.Types.ObjectId;
  capacity: number;
  rentAmount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>({
  roomNumber: { type: String, required: true },
  hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true },
  capacity: { type: Number, required: true },
  rentAmount: { type: Number, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Tenancy Schema (junction table for room-tenant relationship)
export interface ITenancy extends Document {
  _id: string;
  roomId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date;
  tenantShare?: number; // For shared rooms
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tenancySchema = new Schema<ITenancy>({
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  tenantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  tenantShare: { type: Number }, // Percentage or fixed amount
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Monthly Rent Schema
export interface IMonthlyRent extends Document {
  _id: string;
  tenancyId: mongoose.Types.ObjectId;
  amount: number;
  amountPaid: number;
  status: 'due' | 'partial' | 'paid';
  dueDate: Date;
  period: string; // YYYY-MM format
  lateFee?: number;
  createdAt: Date;
  updatedAt: Date;
}

const monthlyRentSchema = new Schema<IMonthlyRent>({
  tenancyId: { type: Schema.Types.ObjectId, ref: 'Tenancy', required: true },
  amount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['due', 'partial', 'paid'], default: 'due' },
  dueDate: { type: Date, required: true },
  period: { type: String, required: true }, // YYYY-MM
  lateFee: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Bill Schema
export interface IBill extends Document {
  _id: string;
  tenancyId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  amount: number;
  amountPaid: number;
  status: 'due' | 'partial' | 'paid';
  dueDate: Date;
  billType: 'electricity' | 'water' | 'maintenance' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

const billSchema = new Schema<IBill>({
  tenancyId: { type: Schema.Types.ObjectId, ref: 'Tenancy', required: true },
  title: { type: String, required: true },
  description: { type: String },
  amount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  status: { type: String, enum: ['due', 'partial', 'paid'], default: 'due' },
  dueDate: { type: Date, required: true },
  billType: { type: String, enum: ['electricity', 'water', 'maintenance', 'other'], required: true }
}, {
  timestamps: true
});

// Payment Schema
export interface IPayment extends Document {
  _id: string;
  tenantId: mongoose.Types.ObjectId;
  amount: number;
  paymentMethod: 'cash' | 'bank_transfer' | 'cheque' | 'other';
  paymentDate: Date;
  description?: string;
  receiptAttachmentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'bank_transfer', 'cheque', 'other'], required: true },
  paymentDate: { type: Date, required: true },
  description: { type: String },
  receiptAttachmentId: { type: Schema.Types.ObjectId, ref: 'Attachment' }
}, {
  timestamps: true
});

// Payment Allocation Schema
export interface IPaymentAllocation extends Document {
  _id: string;
  paymentId: mongoose.Types.ObjectId;
  dueId: mongoose.Types.ObjectId;
  dueType: 'rent' | 'bill';
  allocatedAmount: number;
  createdAt: Date;
}

const paymentAllocationSchema = new Schema<IPaymentAllocation>({
  paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
  dueId: { type: Schema.Types.ObjectId, required: true },
  dueType: { type: String, enum: ['rent', 'bill'], required: true },
  allocatedAmount: { type: Number, required: true }
}, {
  timestamps: true
});

// Expense Category Schema
export interface IExpenseCategory extends Document {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const expenseCategorySchema = new Schema<IExpenseCategory>({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Expense Schema
export interface IExpense extends Document {
  _id: string;
  hostelId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  amount: number;
  description: string;
  expenseDate: Date;
  attachmentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>({
  hostelId: { type: Schema.Types.ObjectId, ref: 'Hostel', required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'ExpenseCategory', required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  expenseDate: { type: Date, required: true },
  attachmentId: { type: Schema.Types.ObjectId, ref: 'Attachment' }
}, {
  timestamps: true
});

// Inventory Item Schema
export interface IInventoryItem extends Document {
  _id: string;
  name: string;
  description?: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>({
  name: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Room Inventory Schema
export interface IRoomInventory extends Document {
  _id: string;
  roomId: mongoose.Types.ObjectId;
  itemId: mongoose.Types.ObjectId;
  quantity: number;
  condition: 'good' | 'fair' | 'poor' | 'damaged';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const roomInventorySchema = new Schema<IRoomInventory>({
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  itemId: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
  quantity: { type: Number, required: true },
  condition: { type: String, enum: ['good', 'fair', 'poor', 'damaged'], required: true },
  notes: { type: String }
}, {
  timestamps: true
});

// Audit Log Schema
export interface IAuditLog extends Document {
  _id: string;
  actorId: mongoose.Types.ObjectId;
  actorRole: 'admin' | 'tenant';
  tableName: string;
  recordId: string;
  actionType: 'create' | 'update' | 'delete';
  beforeJson?: any;
  afterJson?: any;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole: { type: String, enum: ['admin', 'tenant'], required: true },
  tableName: { type: String, required: true },
  recordId: { type: String, required: true },
  actionType: { type: String, enum: ['create', 'update', 'delete'], required: true },
  beforeJson: { type: Schema.Types.Mixed },
  afterJson: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

// Attachment Schema
export interface IAttachment extends Document {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  storageType: 'gridfs' | 'local';
  gridfsId?: string;
  localPath?: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

const attachmentSchema = new Schema<IAttachment>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true },
  storageType: { type: String, enum: ['gridfs', 'local'], required: true },
  gridfsId: { type: String },
  localPath: { type: String },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Create models
export const User = mongoose.model<IUser>('User', userSchema);
export const Owner = mongoose.model<IOwner>('Owner', ownerSchema);
export const Hostel = mongoose.model<IHostel>('Hostel', hostelSchema);
export const Room = mongoose.model<IRoom>('Room', roomSchema);
export const Tenancy = mongoose.model<ITenancy>('Tenancy', tenancySchema);
export const MonthlyRent = mongoose.model<IMonthlyRent>('MonthlyRent', monthlyRentSchema);
export const Bill = mongoose.model<IBill>('Bill', billSchema);
export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
export const PaymentAllocation = mongoose.model<IPaymentAllocation>('PaymentAllocation', paymentAllocationSchema);
export const ExpenseCategory = mongoose.model<IExpenseCategory>('ExpenseCategory', expenseCategorySchema);
export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', inventoryItemSchema);
export const RoomInventory = mongoose.model<IRoomInventory>('RoomInventory', roomInventorySchema);
export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export const Attachment = mongoose.model<IAttachment>('Attachment', attachmentSchema);
