import { Router, Response } from 'express';
import { UserRole } from '@prisma/client';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { calculateAIInsights, predictDemand, getAIInventoryHealth } from '../services/ai';

const router = Router();

// GET: /api/ai/insights
// Business overview analytics insights
router.get('/insights', authenticateJWT, requireRoles([UserRole.OWNER, UserRole.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.query.storeId as string || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store context required.' });
    }

    const insights = await calculateAIInsights(storeId);
    res.status(200).json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to compile AI Business insights.' });
  }
});

// GET: /api/ai/predictions
// Sales and demand projections
router.get('/predictions', authenticateJWT, requireRoles([UserRole.OWNER, UserRole.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.query.storeId as string || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store context required.' });
    }

    const projections = await predictDemand(storeId);
    res.status(200).json(projections);
  } catch (error) {
    res.status(500).json({ error: 'Failed to compile AI Demand Projections.' });
  }
});

// GET: /api/ai/inventory
// Reorder recommendations and health score
router.get('/inventory', authenticateJWT, requireRoles([UserRole.OWNER, UserRole.MANAGER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.query.storeId as string || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store context required.' });
    }

    const inventoryHealth = await getAIInventoryHealth(storeId);
    res.status(200).json(inventoryHealth);
  } catch (error) {
    res.status(500).json({ error: 'Failed to compile AI Inventory Health scorecard.' });
  }
});
export default router;
