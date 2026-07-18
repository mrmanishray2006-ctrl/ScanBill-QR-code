import { PrismaClient, Product } from '@prisma/client';
import { GoogleGenAI } from '@google/generative-ai'; // Optional Gemini API integration

const prisma = new PrismaClient();

// Initialize Gemini API client if present
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: any = null;
if (geminiApiKey) {
  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    aiClient = ai;
  } catch (e) {
    console.error('Failed to initialize Google GenAI SDK: ', e);
  }
}

export interface AIInsightsResponse {
  todaySales: number;
  yesterdaySales: number;
  weeklySales: number;
  monthlySales: number;
  yearlySales: number;
  topSellingProducts: any[];
  leastSellingProducts: any[];
  peakShoppingHours: { hour: number; count: number }[];
  averageOrderValue: number;
  grossProfit: number;
  netProfit: number;
  inventoryValue: number;
  bestCategory: string;
  worstCategory: string;
  returningCustomers: number;
  newCustomers: number;
  insights: string[];
}

export const calculateAIInsights = async (storeId: string): Promise<AIInsightsResponse> => {
  // Time boundaries
  const now = new Date();
  
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  
  const startOfMonth = new Date(startOfToday);
  startOfMonth.setMonth(startOfMonth.getMonth() - 1);
  
  const startOfYear = new Date(startOfToday);
  startOfYear.setFullYear(startOfYear.getFullYear() - 1);

  // 1. Fetch sales logs
  const orders = await prisma.order.findMany({
    where: { storeId, paymentStatus: 'PAID' },
    include: { items: true },
  });

  const products = await prisma.product.findMany({
    where: { storeId, isDeleted: false },
  });

  // Calculate sales per periods
  let todaySales = 0;
  let yesterdaySales = 0;
  let weeklySales = 0;
  let monthlySales = 0;
  let yearlySales = 0;
  let totalSales = 0;

  orders.forEach((o) => {
    const date = new Date(o.createdAt);
    totalSales += o.total;
    if (date >= startOfToday) todaySales += o.total;
    else if (date >= startOfYesterday) yesterdaySales += o.total;
    
    if (date >= startOfWeek) weeklySales += o.total;
    if (date >= startOfMonth) monthlySales += o.total;
    if (date >= startOfYear) yearlySales += o.total;
  });

  // 2. Average Order Value
  const paidOrdersCount = orders.length;
  const averageOrderValue = paidOrdersCount > 0 ? totalSales / paidOrdersCount : 0;

  // 3. Profit Calculations
  // Assuming a standard margin of 30% for gross profit and 25% for net profit (after taxes/discounts)
  const grossProfit = totalSales * 0.30;
  const netProfit = totalSales * 0.25;

  // 4. Inventory Value
  const inventoryValue = products.reduce((sum, p) => sum + (p.stockQty * p.price), 0);

  // 5. Best & Worst Category
  const categorySales: { [key: string]: number } = {};
  const categoryQuantities: { [key: string]: number } = {};
  
  orders.forEach((o) => {
    o.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const cat = prod?.category || 'General';
      categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity);
      categoryQuantities[cat] = (categoryQuantities[cat] || 0) + item.quantity;
    });
  });

  let bestCategory = 'N/A';
  let worstCategory = 'N/A';
  let maxCatSales = -1;
  let minCatSales = Infinity;

  Object.keys(categorySales).forEach((cat) => {
    if (categorySales[cat] > maxCatSales) {
      maxCatSales = categorySales[cat];
      bestCategory = cat;
    }
    if (categorySales[cat] < minCatSales) {
      minCatSales = categorySales[cat];
      worstCategory = cat;
    }
  });

  if (minCatSales === Infinity) worstCategory = 'N/A';

  // 6. Top & Least Selling Products
  const productSalesMap: { [key: string]: { name: string; sku: string; qty: number; revenue: number } } = {};
  products.forEach((p) => {
    productSalesMap[p.id] = { name: p.name, sku: p.sku, qty: 0, revenue: 0 };
  });

  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (item.productId && productSalesMap[item.productId]) {
        productSalesMap[item.productId].qty += item.quantity;
        productSalesMap[item.productId].revenue += (item.price * item.quantity);
      }
    });
  });

  const sortedProdSales = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty);
  const topSellingProducts = sortedProdSales.slice(0, 5).filter((p) => p.qty > 0);
  const leastSellingProducts = sortedProdSales.slice(-5).reverse().filter((p) => p.qty >= 0);

  // 7. Peak Shopping Hours
  const hourlyDistribution: { [hour: number]: number } = {};
  for (let i = 0; i < 24; i++) hourlyDistribution[i] = 0;

  orders.forEach((o) => {
    const hr = new Date(o.createdAt).getHours();
    hourlyDistribution[hr] = (hourlyDistribution[hr] || 0) + 1;
  });

  const peakShoppingHours = Object.keys(hourlyDistribution).map((hr) => ({
    hour: parseInt(hr),
    count: hourlyDistribution[parseInt(hr)],
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  // 8. New vs Returning Customers
  // Group orders by email
  const customerOrdersMap: { [email: string]: number } = {};
  orders.forEach((o) => {
    customerOrdersMap[o.customerEmail] = (customerOrdersMap[o.customerEmail] || 0) + 1;
  });

  let newCustomers = 0;
  let returningCustomers = 0;
  Object.values(customerOrdersMap).forEach((count) => {
    if (count === 1) newCustomers++;
    else returningCustomers++;
  });

  // 9. Generate AI Insights (Deterministic Fallback or Gemini)
  let insights: string[] = [];

  const weeklySalesDiff = weeklySales - (yesterdaySales * 7); // Mock historical velocity compare
  const salesIncreaseText = weeklySalesDiff >= 0 
    ? `Sales increased by ${Math.min(100, Math.ceil((weeklySalesDiff / (weeklySales || 1)) * 100))}% this week.`
    : `Sales decreased by ${Math.abs(Math.ceil((weeklySalesDiff / (weeklySales || 1)) * 100))}% this week.`;

  const lowStockItems = products.filter((p) => p.stockQty < p.reorderPoint);

  // Default structural Insights
  insights.push(salesIncreaseText);
  if (lowStockItems.length > 0) {
    insights.push(`You have ${lowStockItems.length} low stock products. Reorder recommended immediately.`);
    lowStockItems.slice(0, 2).forEach((p) => {
      insights.push(`You may run out of ${p.name} within ${p.stockQty > 0 ? Math.ceil(p.stockQty / 1.5) : 0} days.`);
    });
  } else {
    insights.push('Inventory health score is high. Stock levels are stable.');
  }

  // Best selling category insight
  if (bestCategory !== 'N/A') {
    insights.push(`The ${bestCategory} category is driving the highest revenue (₹${maxCatSales.toFixed(2)}).`);
  }

  // Peak times
  if (peakShoppingHours.length > 0 && peakShoppingHours[0].count > 0) {
    const pkHr = peakShoppingHours[0].hour;
    const ampm = pkHr >= 12 ? 'PM' : 'AM';
    const dispHr = pkHr % 12 || 12;
    insights.push(`${dispHr} ${ampm} generates the highest customer store traffic.`);
  }

  // Call Gemini if API configured
  if (aiClient) {
    try {
      const model = aiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        Analyze the following retail store performance data and generate 4-5 short, bulleted, natural language business insights. Keep them extremely direct and actionable, tailored for a shop keeper.
        
        Metrics:
        - Weekly Sales: Rs. ${weeklySales.toFixed(2)}
        - Average Order Value: Rs. ${averageOrderValue.toFixed(2)}
        - Inventory Value: Rs. ${inventoryValue.toFixed(2)}
        - Top Products: ${topSellingProducts.map(p => `${p.name} (sold: ${p.qty})`).join(', ')}
        - Low Stock Items: ${lowStockItems.map(p => `${p.name} (${p.stockQty} left)`).join(', ')}
        - Best Category: ${bestCategory}
        - New Customers: ${newCustomers}, Returning Customers: ${returningCustomers}
      `;
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      // Parse bullets from text
      const lines = text.split('\n').map((l: string) => l.replace(/^[*\-\s\d\.]+/g, '').trim()).filter((l: string) => l.length > 0);
      if (lines.length > 0) {
        insights = lines.slice(0, 5);
      }
    } catch (e) {
      console.warn('Gemini prompt generation failed, falling back to local analytics: ', e);
    }
  }

  return {
    todaySales,
    yesterdaySales,
    weeklySales,
    monthlySales,
    yearlySales,
    topSellingProducts,
    leastSellingProducts,
    peakShoppingHours,
    averageOrderValue,
    grossProfit,
    netProfit,
    inventoryValue,
    bestCategory,
    worstCategory,
    returningCustomers,
    newCustomers,
    insights,
  };
};

export const predictDemand = async (storeId: string) => {
  const products = await prisma.product.findMany({
    where: { storeId, isDeleted: false },
  });

  const orders = await prisma.order.findMany({
    where: { storeId, paymentStatus: 'PAID' },
    include: { items: true },
    orderBy: { createdAt: 'asc' },
  });

  // Calculate moving daily average sales velocity per product
  const productDailyVelocity: { [id: string]: number } = {};
  
  // Look at sales in past 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const recentOrders = orders.filter(o => new Date(o.createdAt) >= thirtyDaysAgo);

  products.forEach(p => {
    let totalQtySold = 0;
    recentOrders.forEach(o => {
      o.items.forEach(item => {
        if (item.productId === p.id) {
          totalQtySold += item.quantity;
        }
      });
    });
    // Velocity (qty sold per day over 30 days)
    productDailyVelocity[p.id] = totalQtySold / 30;
  });

  // Predict Next Day, Week, and Month sales revenue using a moving average + growth vector (3%)
  const dailyRevenues: { [dateStr: string]: number } = {};
  orders.forEach(o => {
    const dt = new Date(o.createdAt).toDateString();
    dailyRevenues[dt] = (dailyRevenues[dt] || 0) + o.total;
  });

  const revenueValues = Object.values(dailyRevenues);
  const avgDailyRevenue = revenueValues.length > 0 
    ? revenueValues.reduce((s, r) => s + r, 0) / revenueValues.length 
    : 0;

  // Simple growth factor
  const factor = 1.03; 

  const nextDaySales = avgDailyRevenue * factor;
  const nextWeekSales = avgDailyRevenue * 7 * factor;
  const nextMonthSales = avgDailyRevenue * 30 * factor;

  // Product Inventory Requirements & Out of Stock predictions
  const inventoryRequirements = products.map(p => {
    const dailyVel = productDailyVelocity[p.id] || 0.1; // fallback baseline velocity
    const daysLeft = dailyVel > 0 ? p.stockQty / dailyVel : Infinity;
    
    // Required stock for next month to avoid stockout
    const monthlyDemand = Math.ceil(dailyVel * 30);
    const orderRequired = Math.max(0, monthlyDemand - p.stockQty);

    return {
      productId: p.id,
      name: p.name,
      sku: p.sku,
      currentStock: p.stockQty,
      dailySalesVelocity: dailyVel,
      daysUntilOutOfStock: daysLeft === Infinity ? 999 : Math.ceil(daysLeft),
      monthlyDemandForecast: monthlyDemand,
      reorderRequirement: orderRequired,
    };
  });

  // Low stock and out-of-stock alerts
  const lowStockAlerts = inventoryRequirements.filter(r => r.currentStock < 10);
  const outOfStockPredictions = inventoryRequirements.filter(r => r.daysUntilOutOfStock <= 5);

  return {
    nextDaySales,
    nextWeekSales,
    nextMonthSales,
    inventoryRequirements: inventoryRequirements.sort((a, b) => a.daysUntilOutOfStock - b.daysUntilOutOfStock),
    lowStockAlerts,
    outOfStockPredictions,
  };
};

export const getAIInventoryHealth = async (storeId: string) => {
  const products = await prisma.product.findMany({
    where: { storeId, isDeleted: false },
  });

  const orders = await prisma.order.findMany({
    where: { storeId, paymentStatus: 'PAID' },
    include: { items: true },
  });

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // 1. Health Score calculation (0-100)
  // Deductions for: Out of stock products, low stock ratios, high expiry risk
  const totalCount = products.length;
  if (totalCount === 0) return { healthScore: 100, recommendations: [] };

  const outOfStockCount = products.filter(p => p.stockQty === 0).length;
  const lowStockCount = products.filter(p => p.stockQty < p.reorderPoint && p.stockQty > 0).length;
  
  // Expiry risk (expiring within next 30 days)
  const expiryRiskItems = products.filter(p => p.expiryDate && new Date(p.expiryDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

  let deductions = 0;
  deductions += (outOfStockCount / totalCount) * 50; // out of stock hurts score heavily
  deductions += (lowStockCount / totalCount) * 25;
  deductions += (expiryRiskItems.length / totalCount) * 25;

  const healthScore = Math.max(0, Math.min(100, Math.round(100 - deductions)));

  // 2. Slow moving products (0 sales in past 30 days and has stock)
  const productIdsSold = new Set<string>();
  orders.forEach(o => {
    if (new Date(o.createdAt) >= thirtyDaysAgo) {
      o.items.forEach(item => {
        if (item.productId) productIdsSold.add(item.productId);
      });
    }
  });

  const slowMovingProducts = products.filter(p => !productIdsSold.has(p.id) && p.stockQty > 0);
  
  // Fast moving products (highest quantities sold in past 30 days)
  const itemQtyMap: { [id: string]: number } = {};
  orders.forEach(o => {
    if (new Date(o.createdAt) >= thirtyDaysAgo) {
      o.items.forEach(item => {
        if (item.productId) itemQtyMap[item.productId] = (itemQtyMap[item.productId] || 0) + item.quantity;
      });
    }
  });

  const fastMovingProducts = products
    .filter(p => (itemQtyMap[p.id] || 0) > 0)
    .map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      qtySold30Days: itemQtyMap[p.id],
    }))
    .sort((a, b) => b.qtySold30Days - a.qtySold30Days)
    .slice(0, 5);

  // Recommendations compiling
  const recommendations: string[] = [];
  
  if (outOfStockCount > 0) {
    recommendations.push(`Restock ${outOfStockCount} items immediately to avoid lost sales revenue.`);
  }

  if (expiryRiskItems.length > 0) {
    recommendations.push(`Run promotional discounts on ${expiryRiskItems[0].name} to clear stock before upcoming expiry.`);
  }

  if (slowMovingProducts.length > 0) {
    recommendations.push(`Consider discontinuing slow-moving item [${slowMovingProducts[0].name}] due to zero sales velocity.`);
  }

  return {
    healthScore,
    outOfStockCount,
    lowStockCount,
    expiryRiskCount: expiryRiskItems.length,
    fastMovingProducts,
    slowMovingProducts: slowMovingProducts.slice(0, 5),
    expiryRiskItems: expiryRiskItems.slice(0, 5),
    recommendations,
  };
};
