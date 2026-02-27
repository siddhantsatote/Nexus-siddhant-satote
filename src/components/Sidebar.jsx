import {
  LayoutDashboard,
  AlertTriangle,
  Truck,
  Building2,
  Zap,
  Radio,
  Home,
  ShieldCheck,
  User,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";

const USER_ITEMS = [{ id: "booking", label: "Book Ambulance", icon: Radio }];

const ADMIN_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "incidents", label: "Incidents", icon: AlertTriangle },
  { id: "fleet", label: "Fleet Status", icon: Truck },
  { id: "hospitals", label: "Hospitals", icon: Building2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
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
  isAdmin,
  notifications = [],
  onAdminLogout,
}) {
  const openP1 = incidents.filter(
    (i) => i.priority === "P1" && i.status === "open",
  ).length;
  const notifCount = notifications.length;

  let navItems = [];
  if (role === "user") {
    navItems = USER_ITEMS;
  } else if (role === "driver") {
    navItems = DRIVER_ITEMS;
  } else if (role === "admin") {
    navItems = isAdmin ? ADMIN_ITEMS : [ADMIN_LOGIN_ITEM];
  } else {
    navItems = [{ id: "landing", label: "Home", icon: Home }];
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>🚑 <span>PRAANA</span></h1>
        <p>Emergency Response AI</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.25, ease: "easeOut" }}
              whileHover={{ x: 3 }}
            >
              <Icon className="icon" size={18} />
              <span>{item.label}</span>
              {item.id === "incidents" && openP1 > 0 && (
                <span className="nav-badge">{openP1}</span>
              )}
              {item.id === "hospitals" && notifCount > 0 && (
                <span className="prenotif-count-badge">{notifCount}</span>
              )}
            </motion.div>
          );
        })}
      </nav>

      {role === "admin" && isAdmin && (
        <div className="sidebar-footer">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.78rem",
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
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
