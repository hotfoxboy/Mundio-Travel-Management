// ── companies.js ──────────────────────────────────────────────────────────────
const router = require('express').Router();
const { supabaseAdmin } = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET  /api/companies/me  → infos de l'entreprise courante
router.get('/me', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('*, travel_policies(*)')
    .eq('id', req.profile.company_id)
    .single();
  if (error) return res.status(404).json({ error: 'Entreprise introuvable' });
  res.json(data);
});

// GET  /api/companies  → liste toutes (admin Mundio seulement)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .select('*, profiles(count)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/companies  → créer une entreprise (admin)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .insert(req.body)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PATCH /api/companies/:id
router.patch('/:id', authenticate, requireRole('manager','admin'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('companies')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
