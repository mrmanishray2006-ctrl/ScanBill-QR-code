import { PrismaClient, UserRole, SubscriptionPlan, PaymentStatus, PaymentMethod } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hash standard password: "password"
  const passwordHash = await bcrypt.hash('password', 10);

  // 1. Create Owner User
  const owner = await prisma.user.upsert({
    where: { email: 'owner@store.com' },
    update: {},
    create: {
      email: 'owner@store.com',
      name: 'Rajesh Kumar',
      passwordHash,
      role: UserRole.OWNER,
    },
  });

  // 2. Create Customer User
  const customer = await prisma.user.upsert({
    where: { email: 'customer@email.com' },
    update: {},
    create: {
      email: 'customer@email.com',
      name: 'Amit Sharma',
      passwordHash,
      role: UserRole.CUSTOMER,
    },
  });

  // 3. Create Store
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days active

  const store = await prisma.store.create({
    data: {
      ownerId: owner.id,
      name: 'Kumar Digital Mart',
      address: '12, MG Road, Block C, Bengaluru, KA 560001',
      logoUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=80',
      paymentUpiId: 'kumar.mart@okicici',
      merchantName: 'KUMAR DIGITAL MART',
      razorpayKeyId: 'rzp_test_5M89HqKwsPL2',
      subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: expiresAt,
    },
  });

  // Update Owner Store association
  await prisma.user.update({
    where: { id: owner.id },
    data: {
      employeeProfile: {
        create: {
          storeId: store.id,
          role: UserRole.OWNER,
          permissions: ['ALL'],
        },
      },
    },
  });

  // 4. Create Products
  const productsData = [
    {
      name: 'Wireless Gaming Mouse',
      sku: 'MOUSE-WL-101',
      category: 'Electronics',
      description: 'Ergonomic 2.4GHz wireless gaming mouse with 3200 DPI sensor and RGB lights.',
      price: 1499.00,
      stockQty: 45,
      reorderPoint: 10,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300',
    },
    {
      name: 'Mechanical Keyboard',
      sku: 'KEY-MECH-202',
      category: 'Electronics',
      description: 'Tenkeyless mechanical keyboard with clicky blue switch keys and custom backlighting.',
      price: 2999.00,
      stockQty: 8, // Low Stock!
      reorderPoint: 10,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=300',
    },
    {
      name: 'Noise Cancelling Headphones',
      sku: 'HEAD-NC-303',
      category: 'Electronics',
      description: 'Over-ear active noise cancelling Bluetooth headphones with 30-hour battery life.',
      price: 4999.00,
      stockQty: 25,
      reorderPoint: 10,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
    },
    {
      name: 'Stainless Steel Coffee Mug',
      sku: 'MUG-SS-404',
      category: 'Kitchenware',
      description: 'Double-walled vacuum insulated travel mug, keeps beverages hot for 12 hours.',
      price: 899.00,
      stockQty: 30,
      reorderPoint: 10,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300',
    },
    {
      name: 'RFID Blocking Leather Wallet',
      sku: 'WAL-LTHR-505',
      category: 'Accessories',
      description: 'Genuine leather bi-fold wallet with security RFID blocking slots and card compartments.',
      price: 1299.00,
      stockQty: 4, // Low Stock!
      reorderPoint: 10,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1627124486290-08c8799b75ee?w=300',
    },
    {
      name: 'Eco Organic Cotton Tote Bag',
      sku: 'BAG-TOTE-606',
      category: 'Accessories',
      description: 'Reusable heavy-duty organic cotton tote bag, washable and durable.',
      price: 249.00,
      stockQty: 120,
      reorderPoint: 15,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300',
    },
  ];

  const products = [];
  for (const item of productsData) {
    const p = await prisma.product.create({
      data: {
        storeId: store.id,
        ...item,
      },
    });
    products.push(p);
  }

  // 5. Create Orders
  // Order 1 (2 days ago)
  const order1Date = new Date();
  order1Date.setDate(order1Date.getDate() - 2);
  const order1 = await prisma.order.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      invoiceNumber: 'INV-109021',
      subtotal: 3297.00,
      tax: 593.46,
      discount: 329.70,
      total: 3560.76,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.UPI,
      txRef: 'UPI9031892019A',
      createdAt: order1Date,
      items: {
        create: [
          {
            productId: products[0].id, // Gaming Mouse
            name: products[0].name,
            price: products[0].price,
            quantity: 1,
            tax: 269.82,
            discount: 149.90,
            subtotal: 1499.00,
          },
          {
            productId: products[3].id, // Coffee Mug
            name: products[3].name,
            price: products[3].price,
            quantity: 2,
            tax: 323.64,
            discount: 179.80,
            subtotal: 1798.00,
          },
        ],
      },
    },
  });

  // Order 2 (1 day ago)
  const order2Date = new Date();
  order2Date.setDate(order2Date.getDate() - 1);
  const order2 = await prisma.order.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      invoiceNumber: 'INV-109022',
      subtotal: 4999.00,
      tax: 899.82,
      discount: 499.90,
      total: 5398.92,
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: PaymentMethod.UPI,
      txRef: 'UPI9041289031B',
      createdAt: order2Date,
      items: {
        create: [
          {
            productId: products[2].id, // Headphones
            name: products[2].name,
            price: products[2].price,
            quantity: 1,
            tax: 899.82,
            discount: 499.90,
            subtotal: 4999.00,
          },
        ],
      },
    },
  });

  // 6. Create Subscription Log
  const subLogDate = new Date();
  subLogDate.setDate(subLogDate.getDate() - 6);
  await prisma.subscriptionLog.create({
    data: {
      storeId: store.id,
      plan: SubscriptionPlan.PROFESSIONAL,
      amount: 2499.00,
      startDate: subLogDate,
      endDate: expiresAt,
      status: 'active',
      txId: 'TXN-SUB-INITIAL-PRO',
    },
  });

  // 7. Add Loyalty Card for Amit Sharma
  await prisma.loyaltyCard.create({
    data: {
      customerId: customer.id,
      storeId: store.id,
      points: 89, // Accumulate points from previous orders (total ~8900 spent -> 89 points)
      tier: 'BRONZE',
      referralCode: 'AMIT9983',
    },
  });

  // Update Product Scans and sales generated metrics
  await prisma.product.update({
    where: { id: products[0].id },
    data: { scansCount: 15, salesGenerated: 1499.00 },
  });
  await prisma.product.update({
    where: { id: products[2].id },
    data: { scansCount: 8, salesGenerated: 4999.00 },
  });
  await prisma.product.update({
    where: { id: products[3].id },
    data: { scansCount: 22, salesGenerated: 1798.00 },
  });

  console.log('Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error('Error during seeding: ', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
