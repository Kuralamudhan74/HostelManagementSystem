import { Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { GridFSBucket, ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Attachment } from '../models';
import { logAction } from '../utils/auditLogger';

// Configure multer for local file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOADS_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(',');
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB default
  }
});

// GridFS setup
let gfs: GridFSBucket;

mongoose.connection.once('open', () => {
  const db = mongoose.connection.db;
  if (db) {
    gfs = new GridFSBucket(db, {
      bucketName: 'attachments'
    });
  }
});

// Validation schema
const uploadAttachmentSchema = z.object({
  body: z.object({
    description: z.string().optional()
  })
});

// Upload attachment (supports both local FS and GridFS)
export const uploadAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const { description } = req.body;
    const userId = req.user!._id;
    const storageType = process.env.STORAGE_TYPE || 'local'; // 'local' or 'gridfs'

    let attachmentData: any = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      storageType,
      uploadedBy: userId,
      description
    };

    if (storageType === 'gridfs') {
      // Store in GridFS
      const uploadStream = gfs.openUploadStream(req.file.originalname, {
        metadata: {
          uploadedBy: userId,
          description,
          mimetype: req.file.mimetype
        }
      });

      fs.createReadStream(req.file.path).pipe(uploadStream);

      uploadStream.on('error', (error) => {
        console.error('GridFS upload error:', error);
        res.status(500).json({ message: 'File upload failed' });
      });

      uploadStream.on('finish', async () => {
        // Delete local file after GridFS upload
        fs.unlinkSync(req.file!.path);

        attachmentData.gridfsId = uploadStream.id.toString();
        
        const attachment = new Attachment(attachmentData);
        await attachment.save();

        await logAction(req.user!, 'Attachment', attachment._id, 'create', null, {
          filename: attachment.filename,
          originalName: attachment.originalName,
          storageType: attachment.storageType
        });

        res.status(201).json({
          message: 'File uploaded successfully',
          attachment: {
            id: attachment._id,
            filename: attachment.filename,
            originalName: attachment.originalName,
            mimetype: attachment.mimetype,
            size: attachment.size,
            uploadedAt: attachment.uploadedAt
          }
        });
      });
    } else {
      // Store locally
      attachmentData.localPath = req.file.path;
      
      const attachment = new Attachment(attachmentData);
      await attachment.save();

      await logAction(req.user!, 'Attachment', attachment._id, 'create', null, {
        filename: attachment.filename,
        originalName: attachment.originalName,
        storageType: attachment.storageType
      });

      res.status(201).json({
        message: 'File uploaded successfully',
        attachment: {
          id: attachment._id,
          filename: attachment.filename,
          originalName: attachment.originalName,
          mimetype: attachment.mimetype,
          size: attachment.size,
          uploadedAt: attachment.uploadedAt
        }
      });
    }
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Download attachment
export const downloadAttachment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findById(id);
    if (!attachment) {
      res.status(404).json({ message: 'Attachment not found' });
      return;
    }

    if (attachment.storageType === 'gridfs') {
      // Download from GridFS
      const downloadStream = gfs.openDownloadStream(new ObjectId(attachment.gridfsId));
      
      res.setHeader('Content-Type', attachment.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
      
      downloadStream.pipe(res);

      downloadStream.on('error', (error) => {
        console.error('GridFS download error:', error);
        res.status(500).json({ message: 'File download failed' });
      });
    } else {
      // Download from local filesystem
      if (!attachment.localPath || !fs.existsSync(attachment.localPath)) {
        res.status(404).json({ message: 'File not found on disk' });
        return;
      }

      res.setHeader('Content-Type', attachment.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
      
      const fileStream = fs.createReadStream(attachment.localPath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('Local file download error:', error);
        res.status(500).json({ message: 'File download failed' });
      });
    }
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get attachment info
export const getAttachmentInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findById(id)
      .populate('uploadedBy', 'firstName lastName email');

    if (!attachment) {
      res.status(404).json({ message: 'Attachment not found' });
      return;
    }

    res.json({ attachment });
  } catch (error) {
    console.error('Get attachment info error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete attachment
export const deleteAttachment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findById(id);
    if (!attachment) {
      res.status(404).json({ message: 'Attachment not found' });
      return;
    }

    // Check if user has permission to delete
    if (attachment.uploadedBy.toString() !== req.user!._id && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Permission denied' });
      return;
    }

    // Delete file from storage
    if (attachment.storageType === 'gridfs') {
      gfs.delete(new ObjectId(attachment.gridfsId));
    } else if (attachment.localPath && fs.existsSync(attachment.localPath)) {
      fs.unlinkSync(attachment.localPath);
    }

    // Delete from database
    await Attachment.findByIdAndDelete(id);

    await logAction(req.user!, 'Attachment', id, 'delete', {
      filename: attachment.filename,
      originalName: attachment.originalName
    }, null);

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// List user's attachments
export const getMyAttachments = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '10' } = req.query;
    const userId = req.user!._id;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const attachments = await Attachment.find({ uploadedBy: userId })
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Attachment.countDocuments({ uploadedBy: userId });

    res.json({
      attachments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error('Get my attachments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export { uploadAttachmentSchema };
