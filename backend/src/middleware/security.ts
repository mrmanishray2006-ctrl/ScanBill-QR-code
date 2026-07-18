import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from './auth';

const prisma = new PrismaClient();

// Create a helper to log system audit actions
export const logAuditEvent = async (userId: string | null, action: string, details: any, req?: Request) => {
  try {
    const ipAddress = req?.ip || req?.socket.remoteAddress || null;
    const userAgent = req?.headers['user-agent'] || null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to log audit event: ', error);
  }
};

// Middleware: XSS Input Sanitization
// Sanitizes incoming string inputs recursively to prevent scripts executions
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (data: any): any => {
    if (typeof data === 'string') {
      // Basic HTML entity encoding to neutralize XSS vectors
      return data
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    } else if (Array.isArray(data)) {
      return data.map(item => sanitize(item));
    } else if (typeof data === 'object' && data !== null) {
      const cleanObj: any = {};
      for (const key in data) {
        cleanObj[key] = sanitize(data[key]);
      }
      return cleanObj;
    }
    return data;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

// Global Error Handler middleware to capture and log crashes gracefully
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Uncaught Exception: ', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
  });
};
