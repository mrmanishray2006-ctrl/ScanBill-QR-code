import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    storeId?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_jwt';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_key_jwt';

// Helper to generate access and refresh tokens
export const generateTokens = (user: { id: string; email: string; role: UserRole; storeId?: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role, storeId: user.storeId },
    JWT_SECRET,
    { expiresIn: '15m' } // 15 minutes access expiration
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // 7 days refresh expiration
  );

  return { accessToken, refreshToken };
};

// Middleware: Authenticate JWT Access Token
export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Access token expired or invalid.' });
      }

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        storeId: decoded.storeId
      };
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header missing or malformed.' });
  }
};

// Middleware: Require specific user roles
export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient permissions.' });
    }

    next();
  };
};

// Middleware: Verify specific employee level permissions
export const requireEmployeePermission = (permission: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Owners have bypass access
    if (req.user.role === UserRole.OWNER) {
      return next();
    }

    try {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user.id }
      });

      if (!employee || employee.isDeleted) {
        return res.status(403).json({ error: 'Employee profile not found.' });
      }

      // Check if employee has the specific permission or 'ALL' bypass key
      const hasPermission = employee.permissions.includes(permission) || employee.permissions.includes('ALL');
      if (!hasPermission) {
        return res.status(403).json({ error: `Forbidden: Missing required permission [${permission}].` });
      }

      next();
    } catch (e) {
      res.status(500).json({ error: 'Internal server error verifying employee authorization.' });
    }
  };
};
