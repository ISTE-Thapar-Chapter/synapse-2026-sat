import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { Account } from './models/Account.js';
import { CompetitionConfig } from './models/CompetitionConfig.js';
import { StageService } from './services/stageService.js';

// Route imports
import authRouter from './routes/auth.js';
import stageRouter from './routes/stage.js';
import adminRouter from './routes/admin.js';
import submissionsRouter from './routes/submissions.js';
import evaluationsRouter from './routes/evaluations.js';
import leaderboardRouter from './routes/leaderboard.js';
import rankingRouter from './routes/ranking.js';
import roundRobinRouter from './routes/roundRobin.js';
import mentorRouter from './routes/mentor.js';
import auctionRouter from './routes/auction.js';

const app = express();

// Request logging middleware - logs every incoming request to the console
app.use(requestLogger);

// Global Middleware
const allowedOrigins = env.CLIENT_URL
  ? env.CLIENT_URL
      .split(',')
      .map((origin) => origin.trim().replace(/\/+$/, ''))
      .filter(Boolean)
  : [];

const isAllowedOrigin = (origin: string | undefined) => {
  if (!origin) return true;
  if (allowedOrigins.length === 0) {
    return env.NODE_ENV !== 'production';
  }

  const normalizedOrigin = origin.replace(/\/+$/, '');
  return allowedOrigins.some((allowedOrigin) => {
    if (!allowedOrigin.includes('*')) {
      return normalizedOrigin === allowedOrigin;
    }

    const pattern = allowedOrigin
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`).test(normalizedOrigin);
  });
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach Auth & User Context
app.use(authMiddleware);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/system/stage', stageRouter);
app.use('/api/admin', adminRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/evaluations', evaluationsRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/ranking', rankingRouter);
app.use('/api/round-robin', roundRobinRouter);
app.use('/api/mentor', mentorRouter);
app.use('/api/auction', auctionRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'synapse-2026-api', timestamp: new Date() });
});

// Error handling
app.use(errorHandler);

/**
 * Bootstrap server
 */
export async function startServer() {
  await connectDB();

  // 1. Provision initial administrator account first on backend boot
  const initialAdminEmail = env.ADMIN_INITIAL_EMAIL.toLowerCase().trim();
  let adminAccount = await Account.findOne({ email: initialAdminEmail });
  if (!adminAccount) {
    adminAccount = new Account({
      name: env.ADMIN_INITIAL_NAME,
      email: initialAdminEmail,
      role: 'admin',
    });
    await adminAccount.save();
    console.log(`[Bootstrap] Initial administrator account created on boot: ${initialAdminEmail} (${env.ADMIN_INITIAL_NAME})`);
  } else if (adminAccount.role !== 'admin') {
    adminAccount.role = 'admin';
    await adminAccount.save();
    console.log(`[Bootstrap] Administrator account role verified on boot: ${initialAdminEmail} (role: admin)`);
  } else {
    console.log(`[Bootstrap] Administrator account ready on boot: ${initialAdminEmail} (role: admin)`);
  }

  // 2. Initialize event stages if not present
  await StageService.initializeStages();

  // 3. Initialize default competition config if not present
  const existingConfig = await CompetitionConfig.findOne();
  if (!existingConfig) {
    await CompetitionConfig.create({});
    console.log('[Bootstrap] Initial competition configuration initialized.');
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[Synapse 2026 Server] Running on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
  });

  return { app, server };
}

// Start immediately if executed directly
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('[Bootstrap] Fatal startup error:', err);
    process.exit(1);
  });
}

export default app;
