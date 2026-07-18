import { Router, Response } from 'express';
import { PrismaClient, UserRole, PaymentStatus, PaymentMethod } from '@prisma/client';
import { authenticateJWT, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/security';
import { sendWhatsAppNotification, sendEmailNotification } from '../services/notifications';

const router = Router();
const prisma = new PrismaClient();

// GET: /api/orders
// Fetch transaction log entries for store reports
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const storeId = req.query.storeId as string || req.user?.storeId;
    if (!storeId) {
      return res.status(400).json({ error: 'Store ID context required.' });
    }

    const { start, end, status, search } = req.query;

    const page = Math.max(1, parseInt(req.query.page as string || '1'));
    const limit = Math.max(1, parseInt(req.query.limit as string || '50'));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      storeId,
    };

    // Filter by date boundaries
    if (start && end) {
      whereClause.createdAt = {
        gte: new Date(start as string),
        lte: new Date(new Date(end as string).setHours(23, 59, 59, 999)),
      };
    }

    // Filter by payment status
    if (status && status !== 'all') {
      whereClause.paymentStatus = status.toString().toUpperCase() as PaymentStatus;
    }

    // Search query for customer name, invoice code, or reference ID
    if (search) {
      const q = search.toString().trim();
      whereClause.OR = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { txRef: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [orders, totalCount] = await prisma.$transaction([
      prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    res.status(200).json({
      orders,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve orders ledger.' });
  }
});

// GET: /api/orders/:id
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order invoice not found.' });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invoice details.' });
  }
});

// POST: /api/orders
// Initialize a new Checkout transaction. Deducts inventory stock quantity.
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { storeId, customerEmail, customerName, items, subtotal, tax, discount, total, paymentMethod } = req.body;

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid checkout parameters: Store ID and items list are required.' });
    }

    const invoiceNumber = 'INV-' + Date.now().toString().slice(-6);

    // Initialize Database transaction to allocate stock and create order
    const order = await prisma.$transaction(async (tx) => {
      // 1. Validate and deplete stock levels
      for (const item of items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod || prod.isDeleted || !prod.isActive) {
          throw new Error(`Product [${item.name || 'Unknown'}] is no longer active in the store catalog.`);
        }
        if (prod.stockQty < item.quantity) {
          throw new Error(`Insufficient stock for product: ${prod.name}. Only ${prod.stockQty} left.`);
        }

        // Deplete stock
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.quantity } },
        });
      }

      // 2. Fetch customer profile context if email provided
      let customerUser = null;
      if (customerEmail) {
        customerUser = await tx.user.findUnique({ where: { email: customerEmail } });
      }

      // 3. Create the Order
      const newOrder = await tx.order.create({
        data: {
          storeId,
          customerId: customerUser?.id || null,
          customerName: customerName || customerUser?.name || 'Walk-in Shopper',
          customerEmail: customerEmail || customerUser?.email || 'walkin@customer.com',
          invoiceNumber,
          subtotal: parseFloat(subtotal),
          tax: parseFloat(tax),
          discount: parseFloat(discount),
          total: parseFloat(total),
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: paymentMethod === 'CARD' ? PaymentMethod.CARD : PaymentMethod.UPI,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              name: item.name,
              price: parseFloat(item.price),
              quantity: parseInt(item.quantity),
              tax: parseFloat(item.tax || '0'),
              discount: parseFloat(item.discount || '0'),
              subtotal: parseFloat(item.subtotal || (item.price * item.quantity).toString()),
            })),
          },
        },
      });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Checkout compilation failed.' });
  }
});

// POST: /api/orders/sync
// Bulk synchronize offline orders recorded locally in IndexedDB
router.post('/sync', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orders } = req.body;
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Sync list array is empty.' });
    }

    const syncedResults = [];

    // Sync each order sequentially inside database check constraints
    for (const orderData of orders) {
      try {
        const invoiceExists = await prisma.order.findUnique({
          where: { invoiceNumber: orderData.invoiceNumber },
        });

        if (invoiceExists) {
          syncedResults.push({ invoiceNumber: orderData.invoiceNumber, status: 'ALREADY_SYNCED' });
          continue;
        }

        const syncedOrder = await prisma.$transaction(async (tx) => {
          // Deplete stock values
          for (const item of orderData.items) {
            await tx.product.updateMany({
              where: { id: item.productId, storeId: orderData.storeId },
              data: { stockQty: { decrement: item.quantity } },
            });
          }

          // Create invoice log
          return await tx.order.create({
            data: {
              storeId: orderData.storeId,
              customerName: orderData.customerName || 'Offline Shopper',
              customerEmail: orderData.customerEmail || 'offline@customer.com',
              invoiceNumber: orderData.invoiceNumber,
              subtotal: orderData.subtotal,
              tax: orderData.tax,
              discount: orderData.discount,
              total: orderData.total,
              paymentStatus: PaymentStatus.PAID,
              paymentMethod: PaymentMethod.UPI,
              txRef: orderData.txRef || `OFFLINE-SYNC-${Date.now()}`,
              offlineSynced: true,
              createdAt: new Date(orderData.createdAt),
              items: {
                create: orderData.items.map((i: any) => ({
                  productId: i.productId,
                  name: i.name,
                  price: i.price,
                  quantity: i.quantity,
                  tax: i.tax || 0,
                  discount: i.discount || 0,
                  subtotal: i.subtotal || (i.price * i.quantity),
                })),
              },
            },
          });
        });

        syncedResults.push({ invoiceNumber: syncedOrder.invoiceNumber, status: 'SUCCESS' });
      } catch (err: any) {
        syncedResults.push({ invoiceNumber: orderData.invoiceNumber, status: 'FAILED', error: err.message });
      }
    }

    res.status(200).json(syncedResults);
  } catch (error) {
    res.status(500).json({ error: 'Failed to synchronize local transactions.' });
  }
});

// POST: /api/orders/:id/simulate-payment
// Simulated payment processor (Sandbox controller)
router.post('/:id/simulate-payment', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { success, txRef } = req.body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      return res.status(400).json({ error: 'Order has already been settled.' });
    }

    if (!success) {
      await prisma.order.update({
        where: { id },
        data: { paymentStatus: PaymentStatus.FAILED },
      });
      return res.status(200).json({ status: 'FAILED', message: 'Transaction flagged as rejected.' });
    }

    const referenceTx = txRef || 'TXN-UPI' + Date.now().toString().slice(-8) + 'S';

    // 1. Transaction to update status and add loyalty card points
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Set status to PAID
      const o = await tx.order.update({
        where: { id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          txRef: referenceTx,
        },
      });

      // Update catalog product metrics (salesGenerated counter)
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              salesGenerated: { increment: item.price * item.quantity },
            },
          });
        }
      }

      // Add Loyalty points: 1 point for every ₹100 spent
      if (order.customerId) {
        const pointsAwarded = Math.floor(order.total / 100);
        if (pointsAwarded > 0) {
          const card = await tx.loyaltyCard.findFirst({
            where: { customerId: order.customerId, storeId: order.storeId },
          });

          if (card) {
            const newPoints = card.points + pointsAwarded;
            let tier = 'BRONZE';
            if (newPoints >= 500) tier = 'PLATINUM';
            else if (newPoints >= 300) tier = 'GOLD';
            else if (newPoints >= 100) tier = 'SILVER';

            await tx.loyaltyCard.update({
              where: { id: card.id },
              data: { points: newPoints, tier },
            });
          }
        }
      }

      return o;
    });

    // 2. Dispatch notifications asynchronously (WhatsApp + Email)
    const store = await prisma.store.findUnique({ where: { id: order.storeId } });
    const notificationMessage = `Payment Received! Order ${order.invoiceNumber} at ${store?.name || 'QuickStore'} of Rs. ${order.total.toFixed(2)} is successful. TxRef: ${referenceTx}. Thank you!`;
    
    // Fire notifications (errors are silenced locally in services)
    sendWhatsAppNotification('919876543210', notificationMessage); // Fallback mock phone
    
    const emailBody = `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #eee;">
        <h2>Payment Receipt</h2>
        <p>Hi ${order.customerName},</p>
        <p>Your payment for invoice <strong>${order.invoiceNumber}</strong> is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:15px 0;">
          <thead>
            <tr style="border-bottom:2px solid #ddd;">
              <th style="text-align:left;padding:8px;">Item</th>
              <th style="text-align:center;padding:8px;">Qty</th>
              <th style="text-align:right;padding:8px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px;">${item.name}</td>
                <td style="padding:8px;text-align:center;">${item.quantity}</td>
                <td style="padding:8px;text-align:right;">₹${(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p style="text-align:right;"><strong>Total Paid: ₹${order.total.toFixed(2)}</strong></p>
        <hr/>
        <p style="font-size:12px;color:#888;">Thank you for shopping at ${store?.name}!</p>
      </div>
    `;
    sendEmailNotification(order.customerEmail, `Payment Confirmation: ${order.invoiceNumber}`, emailBody);

    // 3. Low stock validation alerts
    const lowStockAlertProducts = await prisma.product.findMany({
      where: { storeId: order.storeId, stockQty: { lt: 10 }, isDeleted: false },
    });
    if (lowStockAlertProducts.length > 0) {
      // Trigger a WhatsApp alert to owner
      sendWhatsAppNotification('919876543210', `[Low Stock Alert] Products are running out of stock! ${lowStockAlertProducts[0].name} has only ${lowStockAlertProducts[0].stockQty} items left.`);
    }

    res.status(200).json({ status: 'PAID', message: 'Payment successfully resolved.', order: updatedOrder });
  } catch (error) {
    res.status(500).json({ error: 'Simulation transaction settlement failed.' });
  }
});
export default router;
