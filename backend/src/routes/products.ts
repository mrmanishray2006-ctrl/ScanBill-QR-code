import { Router, Response } from 'express';
import { PrismaClient, UserRole, SubscriptionPlan } from '@prisma/client';
import { authenticateJWT, requireRoles, requireEmployeePermission, AuthenticatedRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/security';

const router = Router();
const prisma = new PrismaClient();

// GET: /api/products
// Fetch catalog items. Supports query filters: search, category, status (all, active, disabled)
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.query.storeId as string || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID context is required.' });
    }

    const search = (req.query.search as string || '').trim().toLowerCase();
    const category = req.query.category as string || 'all';
    const status = req.query.status as string || 'all';

    // Pagination query params
    const page = Math.max(1, parseInt(req.query.page as string || '1'));
    const limit = Math.max(1, parseInt(req.query.limit as string || '50'));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      storeId,
      isDeleted: false,
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category !== 'all') {
      whereClause.category = category;
    }

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'disabled') {
      whereClause.isActive = false;
    }

    const [products, totalCount] = await prisma.$transaction([
      prisma.product.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    // Gather unique categories for select options
    const categories = await prisma.product.findMany({
      where: { storeId, isDeleted: false },
      select: { category: true },
      distinct: ['category'],
    });

    res.status(200).json({
      products,
      categories: categories.map(c => c.category),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve products catalog.' });
  }
});

// GET: /api/products/:id
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findFirst({
      where: { id, isDeleted: false },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve product details.' });
  }
});

// POST: /api/products
// Add new Product to inventory catalog
router.post('/', authenticateJWT, requireEmployeePermission('EDIT_CATALOG'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store context not configured.' });
    }

    const { name, sku, category, price, stockQty, reorderPoint, description, imageUrl, gstPercent, discountPercent, expiryDate } = req.body;

    if (!name || !sku || !category || price === undefined || stockQty === undefined) {
      return res.status(400).json({ error: 'Name, SKU, category, price, and stock quantity are required fields.' });
    }

    // 1. Check SKU Uniqueness for this Store
    const duplicateSku = await prisma.product.findFirst({
      where: { storeId, sku: sku.toUpperCase(), isDeleted: false },
    });
    if (duplicateSku) {
      return res.status(400).json({ error: `A product with SKU "${sku}" already exists in your store.` });
    }

    // 2. Subscription Catalog Limit Check
    const activeProductsCount = await prisma.product.count({
      where: { storeId, isDeleted: false },
    });

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (store) {
      if (store.subscriptionPlan === SubscriptionPlan.STARTER && activeProductsCount >= 50) {
        return res.status(403).json({ error: 'Starter plan catalog limit reached (Max 50 active items). Upgrade plan to add more.' });
      }
      if (store.subscriptionPlan === SubscriptionPlan.PROFESSIONAL && activeProductsCount >= 500) {
        return res.status(403).json({ error: 'Professional plan catalog limit reached (Max 500 active items). Upgrade plan to add more.' });
      }
    }

    const product = await prisma.product.create({
      data: {
        storeId,
        name,
        sku: sku.toUpperCase(),
        category,
        price: parseFloat(price),
        stockQty: parseInt(stockQty),
        reorderPoint: reorderPoint !== undefined ? parseInt(reorderPoint) : 10,
        description: description || null,
        imageUrl: imageUrl || null,
        gstPercent: gstPercent !== undefined ? parseFloat(gstPercent) : 18.0,
        discountPercent: discountPercent !== undefined ? parseFloat(discountPercent) : 0.0,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    await logAuditEvent(req.user!.id, 'CREATE_PRODUCT', `Added catalog product: ${name} (SKU: ${sku})`, req);

    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to register new product.' });
  }
});

// PUT: /api/products/:id
// Update product parameters
router.put('/:id', authenticateJWT, requireEmployeePermission('EDIT_CATALOG'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    const { id } = req.params;
    const { name, sku, category, price, stockQty, reorderPoint, description, imageUrl, gstPercent, discountPercent, expiryDate, isActive } = req.body;

    const product = await prisma.product.findFirst({
      where: { id, storeId, isDeleted: false },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized.' });
    }

    // SKU duplication check
    if (sku && sku.toUpperCase() !== product.sku) {
      const duplicateSku = await prisma.product.findFirst({
        where: { storeId, sku: sku.toUpperCase(), id: { not: id }, isDeleted: false },
      });
      if (duplicateSku) {
        return res.status(400).json({ error: `Another product with SKU "${sku}" already exists.` });
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name: name || product.name,
        sku: sku ? sku.toUpperCase() : product.sku,
        category: category || product.category,
        price: price !== undefined ? parseFloat(price) : product.price,
        stockQty: stockQty !== undefined ? parseInt(stockQty) : product.stockQty,
        reorderPoint: reorderPoint !== undefined ? parseInt(reorderPoint) : product.reorderPoint,
        description: description !== undefined ? description : product.description,
        imageUrl: imageUrl !== undefined ? imageUrl : product.imageUrl,
        gstPercent: gstPercent !== undefined ? parseFloat(gstPercent) : product.gstPercent,
        discountPercent: discountPercent !== undefined ? parseFloat(discountPercent) : product.discountPercent,
        expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : product.expiryDate,
        isActive: isActive !== undefined ? isActive : product.isActive,
      },
    });

    await logAuditEvent(req.user!.id, 'UPDATE_PRODUCT', `Updated catalog product: ${updatedProduct.name}`, req);

    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product details.' });
  }
});

// PATCH: /api/products/:id/status
// Enable or disable a product
router.patch('/:id/status', authenticateJWT, requireEmployeePermission('EDIT_CATALOG'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({ error: 'Status active flag is required.' });
    }

    const product = await prisma.product.findFirst({
      where: { id, storeId, isDeleted: false },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or unauthorized.' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive },
    });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle product status.' });
  }
});

// POST: /api/products/:id/scan
// Record scan hit analytics (increases scan metric counters)
router.post('/:id/scan', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.product.update({
      where: { id },
      data: { scansCount: { increment: 1 } },
    });
    res.status(200).json({ success: true, scansCount: updated.scansCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update scan analytics.' });
  }
});

// DELETE: /api/products/:id
// Soft delete product from store database
router.delete('/:id', authenticateJWT, requireEmployeePermission('EDIT_CATALOG'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.user!.storeId;
    const { id } = req.params;

    const product = await prisma.product.findFirst({
      where: { id, storeId, isDeleted: false },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    await prisma.product.update({
      where: { id },
      data: { isDeleted: true },
    });

    await logAuditEvent(req.user!.id, 'DELETE_PRODUCT', `Soft deleted catalog product: ${product.name}`, req);

    res.status(200).json({ message: 'Product successfully removed from catalog.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});
export default router;
