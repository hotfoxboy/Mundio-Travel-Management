const router = require('express').Router();
const Joi    = require('joi');
const { supabaseAdmin } = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const emailService = require('../lib/email');

const requestSchema = Joi.object({
  trip_type:      Joi.string().valid('flight','hotel','package').required(),
  destination:    Joi.string().required(),
  origin:         Joi.string().optional(),
  departure_date: Joi.string().isoDate().required(),
  return_date:    Joi.string().isoDate().optional(),
  passengers:     Joi.number().integer().min(1).max(20).default(1),
  cabin_class:    Joi.string().valid('economy','premium_economy','business','first').default('economy'),
  hotel_name:     Joi.string().optional(),
  hotel_checkin:  Joi.string().isoDate().optional(),
  hotel_checkout: Joi.string().isoDate().optional(),
  purpose:        Joi.string().max(500).optional(),
  department:     Joi.string().optional(),
  cost_center:    Joi.string().optional(),
  total_amount:   Joi.number().positive().optional(),
  currency:       Joi.string().default('MZN'),
  notes:          Joi.string().max(1000).optional(),
  traveler_id:    Joi.string().uuid().optional(), // si manager crée pour quelqu'un
});

// ── GET /api/requests ─────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const { profile } = req;
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('travel_requests')
    .select(`
      *,
      traveler:profiles!traveler_id(id, first_name, last_name, email, department),
      created_by_profile:profiles!created_by(id, first_name, last_name)
    `, { count: 'exact' })
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  // Les travelers ne voient que leurs propres demandes
  if (profile.role === 'traveler') {
    query = query.eq('traveler_id', profile.id);
  }

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, page: Number(page), limit: Number(limit) });
});

// ── GET /api/requests/:id ─────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('travel_requests')
    .select(`
      *,
      traveler:profiles!traveler_id(*),
      approvals(*, approver:profiles!approver_id(first_name, last_name, role))
    `)
    .eq('id', req.params.id)
    .eq('company_id', req.profile.company_id)
    .single();

  if (error) return res.status(404).json({ error: 'Demande introuvable' });
  res.json(data);
});

// ── POST /api/requests ────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  const { error: valErr, value } = requestSchema.validate(req.body);
  if (valErr) return res.status(400).json({ error: valErr.details[0].message });

  const { profile } = req;
  const travelerId = value.traveler_id || profile.id;

  // Vérifier que le traveler appartient à la même entreprise
  if (value.traveler_id && profile.role === 'traveler') {
    return res.status(403).json({ error: 'Vous ne pouvez créer des demandes que pour vous-même' });
  }

  // Récupérer la politique de l'entreprise
  const { data: policy } = await supabaseAdmin
    .from('travel_policies')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .single();

  // Déterminer si approbation nécessaire
  const needsApproval = policy && value.total_amount >= policy.approval_threshold;
  const initialStatus = needsApproval ? 'pending_approval' : 'approved';

  const { data: request, error } = await supabaseAdmin
    .from('travel_requests')
    .insert({
      ...value,
      traveler_id: travelerId,
      created_by:  profile.id,
      company_id:  profile.company_id,
      status:      initialStatus,
      department:  value.department || profile.department,
      cost_center: value.cost_center || profile.cost_center,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Si approbation requise → créer la ligne d'approbation et notifier
  if (needsApproval) {
    // Trouver un approver dans l'entreprise
    const { data: approvers } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name')
      .eq('company_id', profile.company_id)
      .eq('role', policy.approver_role || 'approver')
      .eq('is_active', true);

    if (approvers?.length) {
      await supabaseAdmin.from('approvals').insert(
        approvers.map(a => ({ request_id: request.id, approver_id: a.id }))
      );

      // Notifier les approvers
      for (const approver of approvers) {
        await emailService.sendApprovalRequest({
          to:            approver.email,
          approver_name: approver.first_name,
          requester:     `${profile.first_name} ${profile.last_name}`,
          reference:     request.reference,
          destination:   request.destination,
          amount:        value.total_amount,
          approve_url:   `${process.env.FRONTEND_URL}/requests/${request.id}`,
        }).catch(console.error);
      }
    }
  }

  res.status(201).json(request);
});

// ── PATCH /api/requests/:id/status ───────────────────────────────────────────
// Approuver / rejeter / annuler
router.patch('/:id/status', authenticate, async (req, res) => {
  const { status, rejection_reason, gds_pnr } = req.body;
  const { profile } = req;

  const validTransitions = {
    traveler:  ['cancelled'],
    manager:   ['cancelled', 'approved', 'rejected'],
    approver:  ['approved', 'rejected'],
    admin:     ['draft','pending_approval','approved','rejected','booked','cancelled'],
  };

  const allowed = validTransitions[profile.role] || [];
  if (!allowed.includes(status)) {
    return res.status(403).json({ error: `Transition vers "${status}" non autorisée pour votre rôle` });
  }

  // Vérifier que la demande appartient à l'entreprise
  const { data: existing } = await supabaseAdmin
    .from('travel_requests')
    .select('*')
    .eq('id', req.params.id)
    .eq('company_id', profile.company_id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Demande introuvable' });

  const update = { status };
  if (rejection_reason) update.rejection_reason = rejection_reason;
  if (gds_pnr) update.gds_pnr = gds_pnr;
  if (status === 'booked') {
    update.booked_at = new Date().toISOString();
    update.booked_by = profile.id;
  }

  const { data, error } = await supabaseAdmin
    .from('travel_requests')
    .update(update)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Mettre à jour l'approbation si applicable
  if (['approved','rejected'].includes(status)) {
    await supabaseAdmin.from('approvals')
      .update({ status, decided_at: new Date().toISOString() })
      .eq('request_id', req.params.id)
      .eq('approver_id', profile.id);
  }

  // Notifier le demandeur
  const { data: travelerProfile } = await supabaseAdmin
    .from('profiles')
    .select('email, first_name')
    .eq('id', existing.traveler_id)
    .single();

  if (travelerProfile) {
    await emailService.sendStatusUpdate({
      to:         travelerProfile.email,
      name:       travelerProfile.first_name,
      reference:  existing.reference,
      status,
      destination: existing.destination,
      reason:     rejection_reason,
    }).catch(console.error);
  }

  res.json(data);
});

// ── Companies routes ──────────────────────────────────────────────────────────
module.exports = router;
