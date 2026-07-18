import { Router, Response } from 'express';
import { PrismaClient, UserRole, SubscriptionPlan } from '@prisma/client';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/security';

const router = Router();
const prisma = new PrismaClient();

// GET: /api/stores
// List all stores owned by the authenticated owner
router.get('/', authenticateJWT, requireRoles([UserRole.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const stores = await prisma.store.findMany({
      where: { ownerId, isDeleted: false },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(stores);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve merchant store directory.' });
  }
});

// GET: /api/stores/:id
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const store = await prisma.store.findFirst({
      where: { id, isDeleted: false }
    });

    if (!store) {
      return res.status(404).json({ error: 'Store profile not found.' });
    }

    res.status(200).json(store);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store details.' });
  }
});

// POST: /api/stores
// Register a new store (Enterprise Multi-Store Support)
router.post('/', authenticateJWT, requireRoles([UserRole.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const { name, address, paymentUpiId, merchantName } = req.body;

    if (!name || !paymentUpiId || !merchantName) {
      return res.status(400).json({ error: 'Name, UPI VPA, and merchant display name are required.' });
    }

    // 1. Subscription Check: Starter limits to 1 active store
    const existingStoresCount = await prisma.store.count({
      where: { ownerId, isDeleted: false }
    });

    // Grab current store's subscription tier
    const currentStore = await prisma.store.findFirst({
      where: { ownerId, isDeleted: false }
    });

    if (currentStore && currentStore.subscriptionPlan === SubscriptionPlan.STARTER && existingStoresCount >= 1) {
      return res.status(403).json({
        error: 'Multi-store limit reached. Please upgrade to a Professional or Enterprise plan to register unlimited stores.'
      });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days active

    const newStore = await prisma.store.create({
      data: {
        ownerId,
        name,
        address: address || 'Store Address details...',
        paymentUpiId,
        merchantName,
        subscriptionPlan: currentStore?.subscriptionPlan || SubscriptionPlan.PROFESSIONAL,
        subscriptionExpiresAt: currentStore?.subscriptionExpiresAt || expiresAt
      }
    });

    // Automatically add owner as an employee to the new store catalog
    await prisma.employee.create({
      data: {
        userId: ownerId,
        storeId: newStore.id,
        role: UserRole.OWNER,
        permissions: ['ALL']
      }
    });

    await logAuditEvent(ownerId, 'CREATE_STORE', `Created new store: ${name} (ID: ${newStore.id})`, req);

    res.status(201).json(newStore);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize store profile.' });
  }
});

// PUT: /api/stores/:id
// Update Store profile, gateway settings
router.put('/:id', authenticateJWT, requireRoles([UserRole.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const { id } = req.params;
    const { name, address, logoUrl, paymentUpiId, merchantName, razorpayKeyId, razorpayKeySecret } = req.body;

    const store = await prisma.store.findFirst({
      where: { id, ownerId, isDeleted: false }
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found or unauthorized.' });
    }

    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        name: name || store.name,
        address: address !== undefined ? address : store.address,
        logoUrl: logoUrl !== undefined ? logoUrl : store.logoUrl,
        paymentUpiId: paymentUpiId || store.paymentUpiId,
        merchantName: merchantName || store.merchantName,
        razorpayKeyId: razorpayKeyId !== undefined ? razorpayKeyId : store.razorpayKeyId,
        razorpayKeySecret: razorpayKeySecret !== undefined ? razorpayKeySecret : store.razorpayKeySecret
      }
    });

    await logAuditEvent(ownerId, 'UPDATE_STORE', `Updated settings for store: ${updatedStore.name}`, req);

    res.status(200).json(updatedStore);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// POST: /api/stores/:id/upgrade
// Upgrade subscription tier
router.post('/:id/upgrade', authenticateJWT, requireRoles([UserRole.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ownerId = req.user!.id;
    const { id } = req.params;
    const { plan, txRef } = req.body; // plan: STARTER, PROFESSIONAL, BUSINESS, ENTERPRISE

    const store = await prisma.store.findFirst({
      where: { id, ownerId, isDeleted: false }
    });

    if (!store) {
      return res.status(404).json({ error: 'Store profile not found.' });
    }

    let amount = 999.00;
    let selectedPlan = SubscriptionPlan.STARTER;

    if (plan === 'PROFESSIONAL') {
      amount = 2499.00;
      selectedPlan = SubscriptionPlan.PROFESSIONAL;
    } else if (plan === 'BUSINESS') {
      amount = 3999.00;
      selectedPlan = SubscriptionPlan.BUSINESS;
    } else if (plan === 'ENTERPRISE') {
      amount = 5999.00;
      selectedPlan = SubscriptionPlan.ENTERPRISE;
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const result = await prisma.$transaction(async (tx) => {
      const updatedStore = await tx.store.update({
        where: { id },
        data: {
          subscriptionPlan: selectedPlan,
          subscriptionStatus: 'active',
          subscriptionExpiresAt: expiryDate
        }
      });

      const log = await tx.subscriptionLog.create({
        data: {
          storeId: id,
          plan: selectedPlan,
          amount,
          startDate: new Date(),
          endDate: expiryDate,
          status: 'active',
          txId: txRef || `TXN-SUB-MOCK-${Date.now()}`
        }
      });

      return { updatedStore, log };
    });

    await logAuditEvent(ownerId, 'UPGRADE_SUBSCRIPTION', `Upgraded store ${store.name} to ${selectedPlan}`, req);

    res.status(200).json(result.updatedStore);
  } catch (error) {
    res.status(500).json({ error: 'Subscription upgrade failed.' });
  }
});
export default router;
