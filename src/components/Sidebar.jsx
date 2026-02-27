import { 
  LayoutDashboard, AlertTriangle, Truck, Building2, Zap, Radio, Info, PhoneIncoming
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
  { id: 'calls', label: 'AI Calls', icon: PhoneIncoming },
  { id: 'fleet', label: 'Fleet Status', icon: Truck },
  { id: 'hospitals', label: 'Hospitals', icon: Building2 },
  { id: 'surge', label: 'Surge Mode', icon: Zap },
];

export default function Sidebar({ activeView, setActiveView, incidents, usingDemo }) {
  const openP1 = incidents.filter(i => i.priority === 'P1' && i.status === 'open').length;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>🚑 PRAANA</h1>
        <p>Emergency Response AI</p>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => setActiveView(item.id)}
            >
              <Icon className="icon" size={18} />
              <span>{item.label}</span>
              {item.id === 'incidents' && openP1 > 0 && (
                <span className="nav-badge">{openP1}</span>
              )}
              {item.id === 'surge' && (
                <Zap size={12} style={{ marginLeft: 'auto', color: '#f59e0b', opacity: 0.6 }} />
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {usingDemo && (
          <div className="demo-badge">
            <Info size={14} />
            <span>Demo Mode — No Supabase</span>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Radio size={12} />
          <span>108 — GVK EMRI Connected</span>
        </div>
      </div>
    </aside>
  );
}
