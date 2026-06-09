require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes     = require('./routes/auth');
const companyRoutes  = require('./routes/companies');
const userRoutes     = require('./routes/users');
const requestRoutes  = require('./routes/requests');
const approvalRoutes = require('./routes/approvals');
const budgetRoutes   = require('./routes/budgets');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Sécurité de base ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.vercel\.app$/
  ],
  credentials: true,
}));
app.use(express.json());

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Trop de requêtes' }));
app.use('/api',      rateLimit({ windowMs: 1  * 60 * 1000, max: 120 }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/requests',  requestRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/budgets',   budgetRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
});

app.listen(PORT, () => console.log(`🚀 API Mundio → http://localhost:${PORT}`));
