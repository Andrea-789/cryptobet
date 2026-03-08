import 'dotenv/config'; 
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import db from './src/config/db.js';
import authRoutes from './routes/auth.js';
import depositRoutes from './routes/deposits.js';
import gameRoutes from './routes/games.js';
import withdrawalRoutes from './routes/withdrawals.js';
import exchangeRoutes from './routes/exchange.js';
import adminRoutes from './routes/admin.js';
import userPanelRoutes from './routes/userPanel.js';
import leaderboardRoutes from './routes/leaderboard.js';
import vipRoutes from './routes/vip.js';
import notificationRoutes from './routes/notifications.js';
import { startDepositPoller } from './src/services/depositPoller.js';
import tradingRoutes from './routes/trading.js';
const app = express();
const httpServer = createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL,       
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean);
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.use((req, res, next) => { if (req.method === 'OPTIONS') return cors(corsOptions)(req, res, next); next(); }); // preflight
app.use(express.json());
app.use('/trading', tradingRoutes);
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true }
});
const userSockets = new Map();
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token missing'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.wallet = decoded.wallet;
    next();
  } catch { next(new Error('Invalid token')); }
});
io.on('connection', (socket) => {
  console.log(`Socket connected: user ${socket.userId} (${socket.wallet})`);
  userSockets.set(socket.userId, socket.id);
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: user ${socket.userId}`);
    userSockets.delete(socket.userId);
  });
});
app.set('io', io);
app.set('userSockets', userSockets);
app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ status: 'ok', db: 'connected', time: result.rows[0].now, sockets: userSockets.size });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});
app.use('/auth', authRoutes);
app.use('/deposits', depositRoutes);
app.use('/games', gameRoutes);
app.use('/withdrawals', withdrawalRoutes);
app.use('/exchange', exchangeRoutes);
app.use('/admin', adminRoutes);
app.use('/user', userPanelRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/vip', vipRoutes);
app.use('/notifications', notificationRoutes);
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startDepositPoller(io, userSockets);
});