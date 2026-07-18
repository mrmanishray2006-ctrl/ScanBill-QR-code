import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Middleware & Security Imports
import { sanitizeInput, errorHandler } from './middleware/security';

// Router Imports
import authRouter from './routes/auth';
import storesRouter from './routes/stores';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import employeesRouter from './routes/employees';
import loyaltyRouter from './routes/loyalty';
import aiRouter from './routes/ai';

// Voice parsing import
import { parseVoiceCommand } from './services/voice';

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Headers Configuration (Helmet)
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS) setup
app.use(cors({
  origin: '*', // Allows connections from mobile browsers or local Next.js client
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 3. API Rate Limiting (Protects from brute force requests)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 200, // limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again after 15 minutes.' },
});
app.use('/api/', apiLimiter);

// 4. Request Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 5. Input Sanitizer (XSS & HTML Injection Protection)
app.use(sanitizeInput);

// 6. Mount REST API Routes
app.use('/api/auth', authRouter);
app.use('/api/stores', storesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/loyalty', loyaltyRouter);
app.use('/api/ai', aiRouter);

// POST: /api/voice-billing/parse
// Parses voice text inputs into action items (Voice Billing parsing endpoint)
app.post('/api/voice-billing/parse', (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Transcript transcript text is required.' });
    }

    const command = parseVoiceCommand(transcript);
    res.status(200).json(command);
  } catch (error) {
    res.status(500).json({ error: 'Voice parser engine crashed.' });
  }
});

// 7. Base Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

// 8. Global Error Interceptor Middleware
app.use(errorHandler);

// Start listening
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  QuickStore Enterprise API Server is active!     `);
  console.log(`  Port: ${PORT}                                   `);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================`);
});
export default app;
