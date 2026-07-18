import { Router, Response } from 'express';
import { PrismaClient, UserRole, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { generateTokens, AuthenticatedRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/security';

const router = Router();
const prisma = new PrismaClient();
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_key_jwt';

// POST: /api/auth/signup
// Supports both OWNER and CUSTOMER roles registration
router.post('/signup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, role, storeName, upiId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // SQL transaction to write User, Store, and Default Subscripton
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: role === 'OWNER' ? UserRole.OWNER : UserRole.CUSTOMER,
        },
      });

      let store = null;

      if (role === 'OWNER') {
        if (!storeName || !upiId) {
          throw new Error('Store name and merchant UPI VPA are required for owner registration.');
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days default active

        // Create Store
        store = await tx.store.create({
          data: {
            ownerId: user.id,
            name: storeName,
            address: 'Add physical storefront details inside Settings...',
            paymentUpiId: upiId,
            merchantName: storeName.toUpperCase(),
            subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
            subscriptionStatus: 'active',
            subscriptionExpiresAt: expiresAt,
          },
        });

        // Register owner as an Employee in Employee directory
        await tx.employee.create({
          data: {
            userId: user.id,
            storeId: store.id,
            role: UserRole.OWNER,
            permissions: ['ALL'],
          },
        });

        // Initialize default professional billing log
        await tx.subscriptionLog.create({
          data: {
            storeId: store.id,
            plan: SubscriptionPlan.PROFESSIONAL,
            amount: 2499.00,
            startDate: new Date(),
            endDate: expiresAt,
            status: 'active',
            txId: `TXN-SUB-INIT-${Date.now()}`,
          },
        });
      }

      return { user, store };
    });

    const storeRefId = result.store ? result.store.id : undefined;
    const tokens = generateTokens({
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      storeId: storeRefId,
    });

    // Save refresh token hash in DB
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await prisma.user.update({
      where: { id: result.user.id },
      data: { refreshTokenHash },
    });

    await logAuditEvent(result.user.id, 'SIGNUP', `Created account with role ${result.user.role}`, req);

    res.status(201).json({
      message: 'Registration completed successfully.',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        storeId: storeRefId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server registration error.' });
  }
});

// POST: /api/auth/login
router.post('/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await prisma.user.findFirst({
      where: { email, isDeleted: false },
      include: { employeeProfile: true },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid login email or password.' });
    }

    // Get active store context if employee or owner
    const storeId = user.role === UserRole.OWNER 
      ? (await prisma.store.findFirst({ where: { ownerId: user.id, isDeleted: false } }))?.id
      : user.employeeProfile?.storeId;

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      storeId,
    });

    // Save refresh token in DB
    const refreshTokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    await logAuditEvent(user.id, 'LOGIN', `Logged in successfully`, req);

    res.status(200).json({
      message: 'Login successful.',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal login server error.' });
  }
});

// POST: /api/auth/refresh
router.post('/refresh', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }

    let payload: any = null;
    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (e) {
      return res.status(403).json({ error: 'Invalid or expired refresh token.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { employeeProfile: true },
    });

    if (!user || !user.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
      return res.status(403).json({ error: 'Session expired. Please log in again.' });
    }

    // Get store context
    const storeId = user.role === UserRole.OWNER 
      ? (await prisma.store.findFirst({ where: { ownerId: user.id, isDeleted: false } }))?.id
      : user.employeeProfile?.storeId;

    const tokens = generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      storeId,
    });

    // Rotate refresh token hash in DB
    const newRefreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newRefreshHash },
    });

    res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal token rotation error.' });
  }
});

// POST: /api/auth/logout
router.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.body;
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
      await logAuditEvent(userId, 'LOGOUT', `Logged out`, req);
    }
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal logout error.' });
  }
});
export default router;
