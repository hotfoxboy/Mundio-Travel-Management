const router  = require('express').Router();
const Joi     = require('joi');
const { supabase, supabaseAdmin } = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');
const emailService = require('../lib/email');

// ── Schémas de validation ─────────────────────────────────────────────────────
const registerSchema = Joi.object({
  email:      Joi.string().email().required(),
  password:   Joi.string().min(8).required(),
  first_name: Joi.string().min(2).required(),
  last_name:  Joi.string().min(2).required(),
  phone:      Joi.string().optional(),
  invite_token: Joi.string().optional(),  // si invitation
  company_name: Joi.string().optional(),  // si création d'une nouvelle entreprise
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { email, password, first_name, last_name, phone, invite_token, company_name } = value;

  // 1. Créer l'utilisateur dans Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    const msg = authError.message.includes('already registered')
      ? 'Email déjà utilisé'
      : authError.message;
    return res.status(400).json({ error: msg });
  }

  const userId = authData.user.id;
  let companyId = null;
  let role = 'traveler';

  // 2a. Si invitation → rattacher à l'entreprise existante
  if (invite_token) {
    const { data: invite, error: invErr } = await supabaseAdmin
      .from('invitations')
      .select('*')
      .eq('token', invite_token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (invErr || !invite) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: 'Invitation invalide ou expirée' });
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(400).json({ error: 'Email ne correspond pas à l\'invitation' });
    }

    companyId = invite.company_id;
    role      = invite.role;

    await supabaseAdmin.from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id);
  }

  // 2b. Si création d'entreprise → créer la company et devenir manager
  else if (company_name) {
    const { data: company, error: compErr } = await supabaseAdmin
      .from('companies')
      .insert({ name: company_name, country: 'MZ' })
      .select()
      .single();

    if (compErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Erreur création entreprise' });
    }

    companyId = company.id;
    role = 'manager';

    // Créer la politique de voyage par défaut
    await supabaseAdmin.from('travel_policies').insert({
      company_id: companyId,
      name: `Politique ${company_name}`,
    });
  }

  // 3. Créer le profil
  const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    company_id: companyId,
    first_name,
    last_name,
    email,
    phone,
    role,
  });

  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: 'Erreur création profil' });
  }

  // 4. Email de bienvenue
  await emailService.sendWelcome({ email, first_name }).catch(console.error);

  res.status(201).json({
    message: 'Compte créé avec succès',
    user_id: userId,
    role,
    company_id: companyId,
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const { email, password } = value;

  const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  // Récupérer le profil complet
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*, companies(id, name, contract_type)')
    .eq('id', data.user.id)
    .single();

  res.json({
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at:    data.session.expires_at,
    profile,
  });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token requis' });

  const { data, error } = await supabase.auth.refreshSession({ refresh_token });
  if (error) return res.status(401).json({ error: 'Session expirée, reconnectez-vous' });

  res.json({
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at:    data.session.expires_at,
  });
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
  });

  // Toujours répondre OK (sécurité : ne pas révéler si l'email existe)
  res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé' });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  res.json({ profile: req.profile });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  await supabase.auth.signOut();
  res.json({ message: 'Déconnecté' });
});

// ── POST /api/auth/invite ─────────────────────────────────────────────────────
// Réservé aux managers et admins pour inviter des membres
router.post('/invite', authenticate, async (req, res) => {
  const { profile } = req;
  if (!['manager', 'approver', 'admin'].includes(profile.role)) {
    return res.status(403).json({ error: 'Permissions insuffisantes' });
  }

  const { email, role = 'traveler' } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  const validRoles = profile.role === 'admin'
    ? ['traveler', 'manager', 'approver']
    : ['traveler'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: `Rôle invalide. Autorisés : ${validRoles.join(', ')}` });
  }

  // Vérifier si déjà inscrit
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) return res.status(400).json({ error: 'Cet utilisateur est déjà inscrit' });

  // Créer l'invitation
  const { data: invite, error: invErr } = await supabaseAdmin
    .from('invitations')
    .insert({
      company_id: profile.company_id,
      email,
      role,
      invited_by: profile.id,
    })
    .select()
    .single();

  if (invErr) return res.status(500).json({ error: 'Erreur création invitation' });

  // Envoyer l'email d'invitation
  const inviteUrl = `${process.env.FRONTEND_URL}/register?token=${invite.token}`;
  await emailService.sendInvitation({
    email,
    inviter_name: `${profile.first_name} ${profile.last_name}`,
    company_name: profile.companies?.name,
    invite_url:   inviteUrl,
    role,
  }).catch(console.error);

  res.status(201).json({
    message: `Invitation envoyée à ${email}`,
    expires_at: invite.expires_at,
  });
});

module.exports = router;
