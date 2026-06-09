// users.js
const express = require('express');
const { supabaseAdmin } = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const users = express.Router();

users.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, email, role, department, is_active, created_at')
    .eq('company_id', req.profile.company_id)
    .order('last_name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

users.patch('/:id', authenticate, requireRole('manager','admin'), async (req, res) => {
  const allowed = ['role','department','cost_center','phone','is_active'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabaseAdmin
    .from('profiles').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

users.patch('/me/profile', authenticate, async (req, res) => {
  const allowed = ['first_name','last_name','phone','passport_no','passport_exp'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabaseAdmin
    .from('profiles').update(updates).eq('id', req.profile.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// budgets.js
const budgets = express.Router();

budgets.get('/', authenticate, async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  const { data, error } = await supabaseAdmin
    .from('budgets')
    .select('*')
    .eq('company_id', req.profile.company_id)
    .eq('period_year', year);
  if (error) return res.status(500).json({ error: error.message });

  // Calculer le consommé par département
  const { data: spent } = await supabaseAdmin
    .from('travel_requests')
    .select('department, total_amount')
    .eq('company_id', req.profile.company_id)
    .in('status', ['approved','booked'])
    .gte('departure_date', `${year}-01-01`)
    .lte('departure_date', `${year}-12-31`);

  const spentMap = {};
  (spent || []).forEach(r => {
    spentMap[r.department] = (spentMap[r.department] || 0) + (r.total_amount || 0);
  });

  const result = data.map(b => ({ ...b, spent: spentMap[b.department] || 0 }));
  res.json(result);
});

budgets.post('/', authenticate, requireRole('manager','admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('budgets')
    .upsert({ ...req.body, company_id: req.profile.company_id, created_by: req.profile.id })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// approvals.js
const approvals = express.Router();

approvals.get('/pending', authenticate, requireRole('approver','manager','admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('approvals')
    .select('*, travel_requests(*, profiles!traveler_id(first_name, last_name, email))')
    .eq('approver_id', req.profile.id)
    .eq('status', 'pending');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = { users, budgets, approvals };
