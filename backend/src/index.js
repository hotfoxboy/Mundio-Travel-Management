require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes    = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const requestRoutes = require('./routes/requests');
const { users: userRoutes, approvals: approvalRoutes, budgets: budgetRoutes } = require('./routes/users');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    /\.vercel\.app$/
  ],
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api',      rateLimit({ windowMs: 1  * 60 * 1000, max: 120 }));

app.use('/api/auth',      authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/requests',  requestRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/budgets',   budgetRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
});

app.listen(PORT, () => console.log(`🚀 API Mundio → http://localhost:${PORT}`));