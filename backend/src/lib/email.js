const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM || 'noreply@mundiotravel.com';

const BASE_STYLE = `
  font-family: 'Inter', Arial, sans-serif;
  max-width: 520px; margin: 0 auto;
  background: #ffffff; border-radius: 12px;
  border: 1px solid #e5e7eb; overflow: hidden;
`;
const HEADER = (title) => `
  <div style="background:#0D1B2A;padding:28px 32px;text-align:center">
    <span style="font-size:22px;font-weight:700;color:#C9A84C;letter-spacing:0.04em">✈ Mundio Travel Management</span>
    <p style="color:#9BAFC4;margin:6px 0 0;font-size:13px">${title}</p>
  </div>
`;
const FOOTER = `
  <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
    Mundio Travel Management · Corporate Portal · <a href="https://mundiotravel.com" style="color:#C9A84C">mundiotravel.com</a>
  </div>
`;

async function send({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL SIMULÉ] To: ${to} | Subject: ${subject}`);
    return;
  }
  return resend.emails.send({ from: FROM, to, subject, html });
}

module.exports = {
  async sendWelcome({ email, first_name }) {
    return send({
      to: email,
      subject: 'Bienvenue sur le portail Mundio Travel Management',
      html: `<div style="${BASE_STYLE}">
        ${HEADER('Bienvenue !')}
        <div style="padding:32px">
          <h2 style="color:#0D1B2A;margin:0 0 12px">Olá ${first_name} 👋</h2>
          <p style="color:#374151;line-height:1.7">Votre compte a été créé avec succès sur le portail voyage d'affaires Mundio Travel Management.</p>
          <p style="color:#374151;line-height:1.7">Vous pouvez dès maintenant rechercher des vols, des hôtels et soumettre vos demandes de voyage.</p>
          <div style="margin:24px 0">
            <a href="${process.env.FRONTEND_URL}/login" style="background:#C9A84C;color:#0D1B2A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Accéder au portail</a>
          </div>
        </div>
        ${FOOTER}
      </div>`,
    });
  },

  async sendInvitation({ email, inviter_name, company_name, invite_url, role }) {
    const roleLabels = { traveler: 'Voyageur', manager: 'Gestionnaire', approver: 'Approbateur' };
    return send({
      to: email,
      subject: `Invitation à rejoindre ${company_name} sur Mundio Travel Management`,
      html: `<div style="${BASE_STYLE}">
        ${HEADER(`Invitation — ${company_name}`)}
        <div style="padding:32px">
          <p style="color:#374151;line-height:1.7"><strong>${inviter_name}</strong> vous invite à rejoindre <strong>${company_name}</strong> sur le portail voyage d'affaires Mundio Travel Management en tant que <strong>${roleLabels[role] || role}</strong>.</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#6b7280;font-size:13px">⏳ Cette invitation expire dans <strong>7 jours</strong></p>
          </div>
          <div style="margin:24px 0">
            <a href="${invite_url}" style="background:#C9A84C;color:#0D1B2A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Accepter l'invitation</a>
          </div>
        </div>
        ${FOOTER}
      </div>`,
    });
  },

  async sendApprovalRequest({ to, approver_name, requester, reference, destination, amount, approve_url }) {
    return send({
      to,
      subject: `Approbation requise — ${reference} — ${destination}`,
      html: `<div style="${BASE_STYLE}">
        ${HEADER('Demande d\'approbation')}
        <div style="padding:32px">
          <p style="color:#374151;line-height:1.7">Bonjour ${approver_name},</p>
          <p style="color:#374151;line-height:1.7"><strong>${requester}</strong> a soumis une demande de voyage nécessitant votre approbation.</p>
          <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 6px;font-weight:600;color:#0D1B2A">Réf. ${reference}</p>
            <p style="margin:0;color:#374151">📍 ${destination} · 💰 ${amount?.toLocaleString('fr-FR')} MZN</p>
          </div>
          <div style="margin:24px 0;display:flex;gap:12px">
            <a href="${approve_url}" style="background:#C9A84C;color:#0D1B2A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Voir et décider</a>
          </div>
        </div>
        ${FOOTER}
      </div>`,
    });
  },

  async sendStatusUpdate({ to, name, reference, status, destination, reason }) {
    const statusInfo = {
      approved:  { label: 'Approuvée ✅', color: '#059669', bg: '#d1fae5' },
      rejected:  { label: 'Refusée ❌', color: '#dc2626', bg: '#fee2e2' },
      booked:    { label: 'Billets émis ✈️', color: '#0D1B2A', bg: '#C9A84C' },
      cancelled: { label: 'Annulée', color: '#6b7280', bg: '#f3f4f6' },
    };
    const s = statusInfo[status] || { label: status, color: '#374151', bg: '#f9fafb' };

    return send({
      to,
      subject: `Demande ${reference} — ${s.label}`,
      html: `<div style="${BASE_STYLE}">
        ${HEADER('Mise à jour de votre demande')}
        <div style="padding:32px">
          <p style="color:#374151">Bonjour ${name},</p>
          <p style="color:#374151">Votre demande <strong>${reference}</strong> (${destination}) a été mise à jour.</p>
          <div style="background:${s.bg};border-radius:8px;padding:14px 20px;margin:20px 0;display:inline-block">
            <span style="color:${s.color};font-weight:700;font-size:15px">Statut : ${s.label}</span>
          </div>
          ${reason ? `<p style="color:#374151">Motif : ${reason}</p>` : ''}
          <div style="margin:24px 0">
            <a href="${process.env.FRONTEND_URL}/requests" style="background:#C9A84C;color:#0D1B2A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Voir mes demandes</a>
          </div>
        </div>
        ${FOOTER}
      </div>`,
    });
  },
};
