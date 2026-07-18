import { Router, Response } from 'express';
import { PrismaClient, CouponType } from '@prisma/client';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET: /api/loyalty
// Fetch active loyalty points details for customer
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user!.id;
    const storeId = req.query.storeId as string || req.user?.storeId;

    if (!storeId) {
      return res.status(400).json({ error: 'Store context required.' });
    }

    let card = await prisma.loyaltyCard.findFirst({
      where: { customerId, storeId }
    });

    // Auto-create card if first time shopping at this store
    if (!card) {
      card = await prisma.loyaltyCard.create({
        data: {
          customerId,
          storeId,
          referralCode: `REF-${req.user!.name.split(' ')[0].toUpperCase()}-${Date.now().toString().slice(-4)}`
        }
      });
    }

    res.status(200).json(card);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve customer loyalty details.' });
  }
});

// POST: /api/loyalty/referral
// Verify and log a referred checkout bonus code
router.post('/referral', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = req.user!.id;
    const { referralCode, storeId } = req.body;

    if (!referralCode || !storeId) {
      return res.status(400).json({ error: 'Referral code and store context are required.' });
    }

    // Lookup referred card
    const targetCard = await prisma.loyaltyCard.findUnique({
      where: { referralCode }
    });

    if (!targetCard) {
      return res.status(404).json({ error: 'Invalid referral code.' });
    }

    if (targetCard.customerId === customerId) {
      return res.status(400).json({ error: 'You cannot use your own referral code.' });
    }

    // Verify if customer already has a loyalty card registered with a referrer
    let myCard = await prisma.loyaltyCard.findFirst({
      where: { customerId, storeId }
    });

    if (myCard && myCard.referredById) {
      return res.status(400).json({ error: 'You have already applied a referral code.' });
    }

    // SQL Transaction: Set referred code and reward the referrer with 50 loyalty points
    await prisma.$transaction(async (tx) => {
      if (myCard) {
        await tx.loyaltyCard.update({
          where: { id: myCard.id },
          data: { referredById: targetCard.customerId }
        });
      } else {
        await tx.loyaltyCard.create({
          data: {
            customerId,
            storeId,
            referralCode: `REF-${req.user!.name.split(' ')[0].toUpperCase()}-${Date.now().toString().slice(-4)}`,
            referredById: targetCard.customerId
          }
        });
      }

      // Add points to referrer card
      await tx.loyaltyCard.update({
        where: { id: targetCard.id },
        data: { points: { increment: 50 } } // Reward 50 points
      });

      // Generate a 15% discount coupon for the customer
      await tx.coupon.create({
        data: {
          storeId,
          code: `REFER15-${Date.now().toString().slice(-4)}`,
          discountPercent: 15.0,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // valid for 14 days
          type: CouponType.REFERRAL,
          minBillAmount: 500.00
        }
      });
    });

    res.status(200).json({ message: 'Referral code successfully activated. Rewards coupons generated.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve referral code.' });
  }
});

// GET: /api/loyalty/coupons
// Fetch active promo coupons for store
router.get('/coupons', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.query.storeId as string || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store context required.' });
    }

    const coupons = await prisma.coupon.findMany({
      where: {
        storeId,
        isActive: true,
        expiresAt: { gte: new Date() }
      }
    });

    res.status(200).json(coupons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active coupons.' });
  }
});

// POST: /api/loyalty/coupons/verify
// Verify coupon validity against current cart invoice total
router.post('/coupons/verify', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, storeId, billAmount } = req.body;

    if (!code || !storeId || billAmount === undefined) {
      return res.status(400).json({ error: 'Coupon code, Store ID, and bill amount are required.' });
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        storeId,
        code: code.toUpperCase(),
        isActive: true,
        expiresAt: { gte: new Date() }
      }
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon code is invalid or has expired.' });
    }

    if (billAmount < coupon.minBillAmount) {
      return res.status(400).json({
        error: `Minimum bill amount of ₹${coupon.minBillAmount.toFixed(2)} required to apply this coupon.`
      });
    }

    // Calculate savings
    let discount = billAmount * (coupon.discountPercent / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    res.status(200).json({
      valid: true,
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      discountAmount: discount,
      message: `Coupon applied successfully! Saved ₹${discount.toFixed(2)}.`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify coupon code.' });
  }
});
export default router;
