import {
  LayoutDashboard,
  AlertTriangle,
  Truck,
  Building2,
  Zap,
  Radio,
  Info,
  Home,
  ShieldCheck,
  User,
} from "lucide-react";

const USER_ITEMS = [{ id: "booking", label: "Book Ambulance", icon: Radio }];

const ADMIN_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "incidents", label: "Incidents", icon: AlertTriangle },
  { id: "fleet", label: "Fleet Status", icon: Truck },
  { id: "hospitals", label: "Hospitals", icon: Building2 },
  { id: "surge", label: "Surge Mode", icon: Zap },
];

const ADMIN_LOGIN_ITEM = {
  id: "admin",
  label: "Admin Login",
  icon: ShieldCheck,
};

const DRIVER_ITEMS = [{ id: "driver", label: "Driver Console", icon: User }];

export default function Sidebar({
  role,
  activeView,
  setActiveView,
  incidents,
  usingDemo,
  isAdmin,
  onAdminLogout,
}) {
  const openP1 = incidents.filter(
    (i) => i.priority === "P1" && i.status === "open",
  ).length;

  let navItems = [];
  if (role === "user") {
    navItems = USER_ITEMS;
  } else if (role === "driver") {
    navItems = DRIVER_ITEMS;
  } else if (role === "admin") {
    navItems = isAdmin ? ADMIN_ITEMS : [ADMIN_LOGIN_ITEM];
  } else {
    // entry / neutral
    navItems = [{ id: "landing", label: "Home", icon: Home }];
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>🚑 PRAANA</h1>
        <p>Emergency Response AI</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
            >
              <Icon className="icon" size={18} />
              <span>{item.label}</span>
              {item.id === "incidents" && openP1 > 0 && (
                <span className="nav-badge">{openP1}</span>
              )}
              {item.id === "surge" && (
                <Zap
                  size={12}
                  style={{ marginLeft: "auto", color: "#f59e0b", opacity: 0.6 }}
                />
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {role === "admin" && isAdmin && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
            }}
          >
            <span>Logged in as Admin</span>
            {onAdminLogout && (
              <button
                type="button"
                onClick={onAdminLogout}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-blue)",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                Logout
              </button>
            )}
          </div>
        )}
        {usingDemo && (
          <div className="demo-badge">
            <Info size={14} />
            <span>Demo Mode — No Supabase</span>
          </div>
        )}
        <div
          style={{
            marginTop: 12,
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Radio size={12} />
          <span>108 — GVK EMRI Connected</span>
        </div>
      </div>
    </aside>
  );
}
