import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/',         label: 'Dashboard',         end: true },
  { to: '/search',   label: 'Pesquisar Viagens' },
  { to: '/requests', label: 'Solicitações' },
];

const navItemsManager = [
  { to: '/team',    label: 'Equipa' },
  { to: '/policy',  label: 'Política' },
  { to: '/reports', label: 'Relatórios' },
];

function PendingBadge({ role }) {
  const { data } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => api.get('/api/approvals/pending').then(r => r.data),
    enabled: ['approver','manager','admin'].includes(role),
    refetchInterval: 60_000,
  });
  if (!data?.length) return null;
  return (
    <span className="bg-gold text-navy text-[10px] font-bold px-2 py-0.5 rounded-full">
      {data.length} pendente{data.length > 1 ? 's' : ''}
    </span>
  );
}

export default function AppLayout() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const initials = profile
    ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
    : '?';

  async function handleLogout() {
    await logout();
    toast.success('Sessão terminada');
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-[210px] bg-navy-mid border-r border-navy-border flex flex-col flex-shrink-0 py-5">
        <div className="px-5 pb-5 border-b border-navy-border mb-4">
          <div className="font-display font-bold text-gold text-[15px] tracking-wide">🌍 Mundio</div>
          <div className="text-[11px] text-gray-600 mt-0.5">Travel Management</div>
        </div>

        {profile?.companies && (
          <div className="mx-3 mb-4 px-3 py-2 bg-surface-2 border border-navy-border rounded-lg">
            <div className="text-[10px] text-gray-600 uppercase tracking-wider">Empresa</div>
            <div className="text-xs text-white font-medium truncate mt-0.5">{profile.companies.name}</div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto">
          <div className="text-[10px] text-gray-600 uppercase tracking-wider px-4 mb-1">Principal</div>
          {navItems.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="w-4 text-center text-xs">◆</span> {label}
            </NavLink>
          ))}

          {['manager','approver','admin'].includes(profile?.role) && (
            <>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider px-4 mt-4 mb-1">Gestão</div>
              {navItemsManager.map(({ to, label }) => (
                <NavLink key={to} to={to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  <span className="w-4 text-center text-xs">◆</span> {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="px-3 pt-4 border-t border-navy-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gold-dim flex items-center justify-center text-xs font-bold text-gold-light flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{profile?.first_name} {profile?.last_name}</div>
              <div className="text-[11px] text-gray-600 capitalize">{profile?.role}</div>
            </div>
            <button onClick={handleLogout} className="text-gray-600 hover:text-white transition-colors text-xs" title="Sair">
              ⏻
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-navy-mid border-b border-navy-border flex items-center px-7 flex-shrink-0 gap-4">
          <div className="flex-1" />
          <div className="text-xs text-gray-500 bg-surface-3 border border-navy-border rounded-md px-3 py-1.5">
            🏢 {profile?.companies?.name || '—'}
          </div>
          <PendingBadge role={profile?.role} />
        </header>

        <main className="flex-1 overflow-y-auto p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
