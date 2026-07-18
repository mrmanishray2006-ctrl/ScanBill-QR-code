import Razorpay from 'razorpay';

// Initialize Razorpay client
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

let razorpayClient: any = null;

if (razorpayKeyId && razorpayKeySecret) {
  try {
    razorpayClient = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
  } catch (e) {
    console.error('Razorpay initialization failed: ', e);
  }
}

// Generate secure direct UPI Deep Link
// Payload structure: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&tn=INVOICE&cu=INR
export const generateUPIDeepLink = (
  paymentUpiId: string,
  merchantName: string,
  amount: number,
  invoiceNumber: string
): string => {
  const cleanMerchant = encodeURIComponent(merchantName.trim());
  const cleanInvoice = encodeURIComponent(invoiceNumber.trim());
  
  return `upi://pay?pa=${paymentUpiId}&pn=${cleanMerchant}&am=${amount.toFixed(2)}&tn=${cleanInvoice}&cu=INR`;
};

// Create a Razorpay Order transaction
export const createRazorpayOrder = async (amount: number, invoiceNumber: string) => {
  if (!razorpayClient) {
    // Return dummy simulator transaction reference if Razorpay is not configured (sandbox support)
    return {
      id: `rzp_mock_${Date.now()}`,
      amount: amount * 100,
      currency: 'INR',
      receipt: invoiceNumber,
      status: 'created',
      isMock: true,
    };
  }

  try {
    const order = await razorpayClient.orders.create({
      amount: Math.round(amount * 100), // Amount in smallest sub-unit (paise)
      currency: 'INR',
      receipt: invoiceNumber,
    });
    return order;
  } catch (error) {
    console.error('Razorpay Order Creation failed: ', error);
    throw new Error('Failed to create Razorpay secure order.');
  }
};
