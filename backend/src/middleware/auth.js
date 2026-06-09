const { supabaseAdmin } = require('../lib/supabase');

/**
 * Vérifie le Bearer token Supabase et attache req.user + req.profile
 */
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = header.slice(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Token invalide' });

    // Charger le profil complet
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return res.status(403).json({ error: 'Profil introuvable' });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: 'Compte désactivé' });
    }

    req.user    = user;
    req.profile = profile;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Erreur d\'authentification' });
  }
}

/**
 * Vérifie que l'utilisateur a un des rôles requis
 * Usage : requireRole('admin') ou requireRole('manager', 'approver', 'admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile) return res.status(401).json({ error: 'Non authentifié' });
    if (!roles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'Permissions insuffisantes' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
