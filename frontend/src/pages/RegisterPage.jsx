import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';

// ══════════════════════════════════════════════════════════
// REGISTER PAGE
// ══════════════════════════════════════════════════════════
export function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [params]  = useSearchParams();
  const token = params.get('token');
  const { register, handleSubmit } = useForm();

  async function onSubmit(values) {
    setLoading(true);
    try {
      await api.post('/api/auth/register', { ...values, invite_token: token || undefined });
      toast.success('Conta criada! Por favor, inicie sessão.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao criar conta');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display font-bold text-gold text-2xl mb-1">✈ Mundio Travel Management</div>
          <div className="text-gray-500 text-sm">Criar conta</div>
        </div>
        <div className="card space-y-4">
          <h1 className="font-display font-bold text-lg">{token ? 'Aceitar convite' : 'Nova empresa'}</h1>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Nome</label><input {...register('first_name',{required:true})} className="input" placeholder="Ana" /></div>
              <div><label className="label">Apelido</label><input {...register('last_name',{required:true})} className="input" placeholder="Moiane" /></div>
            </div>
            <div><label className="label">Email</label><input {...register('email',{required:true})} className="input" type="email" /></div>
            <div><label className="label">Senha (mín. 8 caracteres)</label><input {...register('password',{required:true,minLength:8})} className="input" type="password" /></div>
            {!token && <div><label className="label">Nome da empresa</label><input {...register('company_name',{required:!token})} className="input" placeholder="BCI Banco" /></div>}
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'A criar...' : 'Criar conta'}</button>
          </form>
          <Link to="/login" className="block text-center text-xs text-gray-500 hover:text-gold">Já tem conta? Entrar</Link>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ══════════════════════════════════════════════════════════
export function DashboardPage() {
  const { profile } = useAuth();
  const { data: requests } = useQuery({
    queryKey: ['requests'],
    queryFn: () => api.get('/api/requests?limit=5').then(r => r.data),
  });
  const { data: budgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get('/api/budgets').then(r => r.data),
  });

  const statusColors = {
    confirmed: 'bg-emerald-500', pending_approval: 'bg-gold', approved: 'bg-emerald-500',
    rejected: 'bg-red-500', booked: 'bg-emerald-500', cancelled: 'bg-gray-500',
  };

  const stats = [
    { label: 'Viagens este mês', value: requests?.total ?? '—', sub: 'solicitações' },
    { label: 'Pendentes', value: requests?.data?.filter(r=>r.status==='pending_approval').length ?? 0, sub: 'aguardam aprovação' },
    { label: 'Aprovadas', value: requests?.data?.filter(r=>['approved','booked'].includes(r.status)).length ?? 0, sub: 'confirmadas' },
    { label: 'Conta', value: profile?.companies?.contract_type ?? '—', sub: 'tipo de contrato' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl">Bom dia, {profile?.first_name} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{profile?.companies?.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="card">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mb-2">{s.label}</div>
            <div className="font-display font-bold text-2xl text-white capitalize">{s.value}</div>
            <div className="text-xs text-gray-600 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Recent requests */}
        <div className="card">
          <h3 className="text-[11px] text-gray-500 uppercase tracking-wider mb-4">Solicitações recentes</h3>
          {!requests?.data?.length && <p className="text-gray-600 text-sm">Nenhuma solicitação ainda</p>}
          {requests?.data?.map(r => (
            <div key={r.id} className="flex items-center gap-2.5 py-2.5 border-b border-navy-border last:border-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[r.status] || 'bg-gray-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.origin || 'MPM'} → {r.destination}</div>
                <div className="text-[11px] text-gray-600">{r.reference} · {r.traveler?.first_name} {r.traveler?.last_name}</div>
              </div>
              <div className="text-xs font-semibold text-gold whitespace-nowrap">
                {r.total_amount ? r.total_amount.toLocaleString('pt-MZ') + ' MZN' : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* Budgets */}
        <div className="card">
          <h3 className="text-[11px] text-gray-500 uppercase tracking-wider mb-4">Orçamento por departamento</h3>
          {!budgets?.length && <p className="text-gray-600 text-sm">Sem orçamentos definidos</p>}
          {budgets?.map(b => {
            const pct = Math.min(100, Math.round((b.spent / b.amount) * 100));
            const over = b.spent > b.amount;
            return (
              <div key={b.id} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>{b.department}</span>
                  <span className={over ? 'text-red-400' : 'text-gray-500'}>
                    {b.spent?.toLocaleString()} / {b.amount?.toLocaleString()} MZN
                  </span>
                </div>
                <div className="h-1.5 bg-surface-3 rounded">
                  <div className={`h-1.5 rounded transition-all ${over ? 'bg-red-500' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// REQUESTS PAGE
// ══════════════════════════════════════════════════════════
export function RequestsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['requests', statusFilter],
    queryFn: () => api.get(`/api/requests${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  });

  const statusBadge = {
    draft:            'bg-gray-700 text-gray-300',
    pending_approval: 'bg-amber-900/40 text-amber-400',
    approved:         'bg-emerald-900/40 text-emerald-400',
    rejected:         'bg-red-900/40 text-red-400',
    booked:           'bg-emerald-900/40 text-emerald-400',
    cancelled:        'bg-gray-800 text-gray-500',
  };

  const statusLabels = {
    draft:'Rascunho', pending_approval:'Pendente', approved:'Aprovada',
    rejected:'Recusada', booked:'Emitida', cancelled:'Cancelada',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl">Solicitações</h1>
          <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} no total</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/search')}>+ Nova solicitação</button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['','pending_approval','approved','booked','cancelled'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-gold text-navy' : 'bg-surface border border-navy-border text-gray-400 hover:text-white'}`}>
            {s ? statusLabels[s] : 'Todas'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-navy-border">
              {['Referência','Viajante','Destino','Datas','Valor','Estado'].map(h => (
                <th key={h} className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">A carregar...</td></tr>}
            {!isLoading && !data?.data?.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-600 text-sm">Nenhuma solicitação encontrada</td></tr>
            )}
            {data?.data?.map(r => (
              <tr key={r.id} onClick={() => navigate(`/requests/${r.id}`)}
                className="border-b border-navy-border/50 hover:bg-surface-2 cursor-pointer transition-colors">
                <td className="px-4 py-3 text-[11px] text-gray-500">{r.reference}</td>
                <td className="px-4 py-3 text-sm">{r.traveler?.first_name} {r.traveler?.last_name}</td>
                <td className="px-4 py-3 text-sm font-medium">{r.origin || 'MPM'} → {r.destination}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{r.departure_date}{r.return_date ? ` → ${r.return_date}` : ''}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gold">{r.total_amount ? r.total_amount.toLocaleString() + ' MZN' : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge-status ${statusBadge[r.status] || 'bg-gray-700 text-gray-300'}`}>
                    {statusLabels[r.status] || r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// REQUEST DETAIL PAGE
// ══════════════════════════════════════════════════════════
export function RequestDetailPage() {
  const { id } = require('react-router-dom').useParams();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: req, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: () => api.get(`/api/requests/${id}`).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, reason }) => api.patch(`/api/requests/${id}/status`, { status, rejection_reason: reason }),
    onSuccess: () => { toast.success('Solicitação actualizada'); qc.invalidateQueries(['requests']); qc.invalidateQueries(['request', id]); },
    onError:   (e) => toast.error(e.response?.data?.error || 'Erro'),
  });

  if (isLoading) return <div className="text-gray-500 text-sm">A carregar...</div>;
  if (!req) return <div className="text-gray-500 text-sm">Solicitação não encontrada</div>;

  const canApprove = ['approver','manager','admin'].includes(profile?.role) && req.status === 'pending_approval';
  const canCancel  = req.status !== 'cancelled' && req.status !== 'booked' &&
                     (req.traveler_id === profile?.id || ['manager','admin'].includes(profile?.role));

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => window.history.back()} className="text-gray-500 hover:text-white text-sm">← Voltar</button>
        <h1 className="font-display font-bold text-xl">{req.reference}</h1>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-2 gap-4">
          <Row label="Viajante" value={`${req.traveler?.first_name} ${req.traveler?.last_name}`} />
          <Row label="Tipo" value={req.trip_type} />
          <Row label="Destino" value={`${req.origin || 'MPM'} → ${req.destination}`} />
          <Row label="Partida" value={req.departure_date} />
          {req.return_date && <Row label="Regresso" value={req.return_date} />}
          <Row label="Passageiros" value={req.passengers} />
          <Row label="Classe" value={req.cabin_class} />
          {req.department && <Row label="Departamento" value={req.department} />}
          {req.total_amount && <Row label="Valor" value={`${req.total_amount.toLocaleString()} ${req.currency}`} />}
          {req.gds_pnr && <Row label="PNR (GDS)" value={req.gds_pnr} />}
          {req.purpose && <Row label="Motivo" value={req.purpose} span />}
          {req.notes && <Row label="Notas" value={req.notes} span />}
        </div>
      </div>

      {/* Actions */}
      {(canApprove || canCancel) && (
        <div className="flex gap-3">
          {canApprove && <>
            <button className="btn-primary" onClick={() => statusMutation.mutate({ status: 'approved' })}>✓ Aprovar</button>
            <button className="btn-outline border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
              onClick={() => { const r = window.prompt('Motivo da recusa:'); if (r) statusMutation.mutate({ status: 'rejected', reason: r }); }}>
              ✕ Recusar
            </button>
          </>}
          {canCancel && <button className="btn-ghost text-red-400" onClick={() => statusMutation.mutate({ status: 'cancelled' })}>Cancelar viagem</button>}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, span }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-white capitalize">{value}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TEAM PAGE
// ══════════════════════════════════════════════════════════
export function TeamPage() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/api/users').then(r => r.data),
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  async function handleInvite(e) {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post('/api/auth/invite', { email: inviteEmail });
      toast.success(`Convite enviado para ${inviteEmail}`);
      setInviteEmail('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar convite');
    } finally { setInviting(false); }
  }

  const roleColors = { traveler:'bg-surface-3 text-gray-300', manager:'bg-amber-900/40 text-amber-400', approver:'bg-blue-900/40 text-blue-400', admin:'bg-purple-900/40 text-purple-400' };

  return (
    <div>
      <h1 className="font-display font-bold text-xl mb-6">Equipa</h1>

      <div className="card mb-6 max-w-md">
        <h3 className="text-sm font-semibold mb-3">Convidar colaborador</h3>
        <form onSubmit={handleInvite} className="flex gap-2">
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
            className="input flex-1" type="email" placeholder="email@empresa.com" />
          <button type="submit" disabled={inviting} className="btn-primary">{inviting ? '...' : 'Convidar'}</button>
        </form>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead><tr className="border-b border-navy-border">
            {['Nome','Email','Departamento','Papel','Estado'].map(h => (
              <th key={h} className="text-left text-[10px] text-gray-500 uppercase tracking-wider px-4 py-3">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600 text-sm">A carregar...</td></tr>}
            {users?.map(u => (
              <tr key={u.id} className="border-b border-navy-border/50">
                <td className="px-4 py-3 text-sm font-medium">{u.first_name} {u.last_name}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{u.email}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{u.department || '—'}</td>
                <td className="px-4 py-3"><span className={`badge-status ${roleColors[u.role]}`}>{u.role}</span></td>
                <td className="px-4 py-3"><span className={`text-xs ${u.is_active ? 'text-emerald-400' : 'text-red-400'}`}>{u.is_active ? 'Activo' : 'Inactivo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// POLICY PAGE
// ══════════════════════════════════════════════════════════
export function PolicyPage() {
  const { data: company } = useQuery({
    queryKey: ['company-me'],
    queryFn: () => api.get('/api/companies/me').then(r => r.data),
  });
  const policy = company?.travel_policies?.[0];

  const items = policy ? [
    { label: 'Classe económica', value: `Voos até ${policy.flight_economy_max_hours}h` },
    { label: 'Económica premium', value: `Voos até ${policy.flight_premium_max_hours}h` },
    { label: 'Classe executiva', value: `Papéis: ${policy.flight_business_roles?.join(', ')}` },
    { label: 'Hotel África', value: `Máx. ${policy.hotel_africa_max_per_night?.toLocaleString()} MZN/noite` },
    { label: 'Hotel Europa', value: `Máx. ${policy.hotel_europe_max_per_night?.toLocaleString()} MZN/noite` },
    { label: 'Aprovação obrigatória', value: `Acima de ${policy.approval_threshold?.toLocaleString()} MZN` },
    { label: 'Antecedência mínima', value: `${policy.advance_booking_days} dias` },
    { label: 'Suplemento urgente', value: `+${policy.urgent_surcharge_pct}%` },
  ] : [];

  return (
    <div className="max-w-lg">
      <h1 className="font-display font-bold text-xl mb-6">Política de Viagens</h1>
      {policy && <p className="text-sm text-gray-500 mb-4">{policy.name}</p>}
      <div className="card space-y-0 p-0 overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-navy-border last:border-0">
            <span className="text-sm text-gray-400">{item.label}</span>
            <span className="text-sm font-medium text-white">{item.value}</span>
          </div>
        ))}
        {!policy && <div className="px-5 py-8 text-center text-gray-600 text-sm">Política ainda não configurada</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// REPORTS PAGE
// ══════════════════════════════════════════════════════════
export function ReportsPage() {
  const { data: requests } = useQuery({
    queryKey: ['requests-all'],
    queryFn: () => api.get('/api/requests?limit=100').then(r => r.data),
  });

  const booked = requests?.data?.filter(r => ['approved','booked'].includes(r.status)) || [];
  const total  = booked.reduce((s, r) => s + (r.total_amount || 0), 0);

  const byDest = {};
  booked.forEach(r => { byDest[r.destination] = (byDest[r.destination] || 0) + 1; });
  const topDest = Object.entries(byDest).sort((a,b) => b[1]-a[1]).slice(0,5);

  return (
    <div>
      <h1 className="font-display font-bold text-xl mb-6">Relatórios</h1>
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card"><div className="label">Total gasto</div><div className="font-display font-bold text-2xl text-gold">{total.toLocaleString()} MZN</div></div>
        <div className="card"><div className="label">Viagens confirmadas</div><div className="font-display font-bold text-2xl">{booked.length}</div></div>
        <div className="card"><div className="label">Destinos únicos</div><div className="font-display font-bold text-2xl">{Object.keys(byDest).length}</div></div>
      </div>
      <div className="card max-w-sm">
        <h3 className="label mb-3">Top destinos</h3>
        {topDest.map(([dest, count]) => (
          <div key={dest} className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium w-12">{dest}</span>
            <div className="flex-1 h-2 bg-surface-3 rounded">
              <div className="h-2 bg-gold rounded" style={{ width: `${(count/booked.length)*100}%` }} />
            </div>
            <span className="text-xs text-gray-500">{count}</span>
          </div>
        ))}
        {!topDest.length && <p className="text-sm text-gray-600">Sem dados suficientes</p>}
      </div>
    </div>
  );
}

export default RegisterPage;
