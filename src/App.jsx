import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Truck,
  Building2,
  Activity,
  ShieldCheck,
} from "lucide-react";
import "./index.css";
import { useRealtimeData } from "./hooks/useRealtimeData";
import { useNotifications } from "./hooks/useNotifications";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import MapView from "./components/MapView";
import IncidentPanel from "./components/IncidentPanel";
import FleetPanel from "./components/FleetPanel";
import HospitalPanel from "./components/HospitalPanel";
import SurgePanel from "./components/SurgePanel";
import BookingPortal from "./components/BookingPortal";
import DriverConsole from "./components/DriverConsole";
import AnalyticsPanel from "./components/AnalyticsPanel";

function StatsRow({ incidents, ambulances, hospitals }) {
  const p1 = incidents.filter(
    (i) => i.priority === "P1" && i.status !== "resolved",
  ).length;
  const p2 = incidents.filter(
    (i) => i.priority === "P2" && i.status !== "resolved",
  ).length;
  const available = ambulances.filter((a) => a.status === "available").length;
  const totalIcu = hospitals.reduce(
    (s, h) => s + (h.icu_beds_available || 0),
    0,
  );

  const stats = [
    { value: p1, label: "Critical (P1)", iconColor: "red", Icon: AlertTriangle },
    { value: p2, label: "Urgent (P2)", iconColor: "yellow", Icon: Activity },
    { value: available, label: "Available Units", iconColor: "green", Icon: Truck },
    { value: totalIcu, label: "ICU Beds", iconColor: "blue", Icon: Building2 },
  ];

  return (
    <div className="stats-row">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          className="stat-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
        >
          <div className={`stat-icon ${s.iconColor}`}>
            <s.Icon size={20} />
          </div>
          <div>
            <AnimatedCounter value={s.value} />
            <div className="stat-label">{s.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === display) return;
    const step = value > display ? 1 : -1;
    const timer = setInterval(() => {
      setDisplay((prev) => {
        const next = prev + step;
        if ((step > 0 && next >= value) || (step < 0 && next <= value)) {
          clearInterval(timer);
          return value;
        }
        return next;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [value]);
  return <div className="stat-value">{display}</div>;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function Landing({ onSelectRole }) {
  return (
    <div className="landing-shell">
      <div className="landing-frame">
        <motion.main
          className="landing-main"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <motion.div className="landing-pill" variants={fadeUp}>
            🚑 PRAANA · Emergency Network
          </motion.div>
          <motion.h1 className="landing-title" variants={fadeUp}>
            AI-Powered{" "}
            <span className="landing-gradient">Emergency Response</span> for
            Every Second That Counts
          </motion.h1>
          <motion.p className="landing-subtitle" variants={fadeUp}>
            Intelligent triage, real-time dispatch, and ICU-aware routing —
            one platform for citizens, dispatchers, and drivers.
          </motion.p>

          <motion.div className="landing-role-buttons" variants={fadeUp}>
            <motion.button
              className="btn btn-primary btn-large"
              onClick={() => onSelectRole("user")}
              whileHover={{ scale: 1.03, boxShadow: '0 6px 20px rgba(59,130,246,0.25)' }}
              whileTap={{ scale: 0.97 }}
            >
              Book Ambulance
            </motion.button>
            <motion.button
              className="btn btn-outline btn-large"
              onClick={() => onSelectRole("admin")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <ShieldCheck size={16} />
              Admin Console
            </motion.button>
            <motion.button
              className="btn btn-outline btn-large"
              onClick={() => onSelectRole("driver")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Driver Login
            </motion.button>
          </motion.div>
        </motion.main>
      </div>
    </div>
  );
}

function AdminLogin({ isAdmin, onLoginSuccess, onGoToDashboard }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (username === "admin" && password === "admin123") {
      setError("");
      onLoginSuccess();
    } else {
      setError("Invalid admin credentials. Please try again.");
    }
  }

  if (isAdmin) {
    return (
      <div className="admin-container">
        <div className="admin-card">
          <div className="admin-header">
            <ShieldCheck size={20} />
            <div>
              <h2>Admin session active</h2>
              <p>Access the live command center dashboard.</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={onGoToDashboard}>
            Go to admin dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-card">
        <div className="admin-header">
          <ShieldCheck size={20} />
          <div>
            <h2>Admin login</h2>
            <p>Restricted view for operations and command center staff.</p>
          </div>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input
              className="input-field"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              className="input-field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="●●●●●●●●"
              required
            />
          </div>
          {error && <div className="admin-error">{error}</div>}
          <button type="submit" className="btn btn-primary w-full">
            Login to admin console
          </button>
          <p className="admin-hint">Demo credentials: admin / admin123</p>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState("entry"); // entry | user | admin | driver
  const [activeView, setActiveView] = useState("landing");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const {
    ambulances,
    hospitals,
    incidents,
    loading,
    usingDemo,
    addIncident,
    updateAmbulanceStatus,
    updateAmbulanceLocation,
    updateIncidentStatus,
    setAllAmbulancesAvailable,
    resetAmbulancePositions,
    deleteAmbulance,
  } = useRealtimeData();
  const {
    notifications,
    addNotification,
    dismissNotification,
    clearForIncident,
  } = useNotifications();

  if (loading) {
    return (
      <div className="loading-screen">
        <motion.div
          className="loading-spinner"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Initializing PRAANA Command Center…
        </motion.div>
      </div>
    );
  }

  function isViewAllowed(nextView) {
    if (role === "entry") {
      return nextView === "landing";
    }
    if (role === "user") {
      return nextView === "booking";
    }
    if (role === "driver") {
      return nextView === "driver";
    }
    // admin role
    if (!isAdmin) {
      return nextView === "admin";
    }
    return (
      nextView === "dashboard" ||
      nextView === "incidents" ||
      nextView === "fleet" ||
      nextView === "hospitals" ||
      nextView === "surge" ||
      nextView === "analytics"
    );
  }

  function handleSetView(nextView) {
    if (!isViewAllowed(nextView)) return;
    setActiveView(nextView);
  }

  function handleNewEmergency() {
    if (role === "admin" && isAdmin) {
      handleSetView("incidents");
    }
    // Also focus the emergency textarea
    setTimeout(() => {
      const el = document.getElementById("emergency-description");
      if (el) el.focus();
    }, 100);
  }

  function handleBack() {
    setIsAdmin(false);
    setRole("entry");
    setActiveView("landing");
  }

  const hideChrome =
    (role === "entry" && activeView === "landing") ||
    (role === "user" && activeView === "booking");

  return (
    <div className="app-layout">
      {!hideChrome && (
        <Sidebar
          role={role}
          activeView={activeView}
          setActiveView={handleSetView}
          incidents={incidents}
          isAdmin={isAdmin}
          notifications={notifications}
          onAdminLogout={() => {
            setIsAdmin(false);
            setRole("entry");
            setActiveView("landing");
          }}
        />
      )}

      <div className="main-wrapper">
        {!hideChrome && (
          <TopBar
            incidents={incidents}
            ambulances={ambulances}
            hospitals={hospitals}
            onNewEmergency={handleNewEmergency}
            onBack={handleBack}
          />
        )}

        <main className="main-content">
          {role === "entry" && activeView === "landing" && (
            <Landing
              onSelectRole={(nextRole) => {
                setRole(nextRole);
                if (nextRole === "user") {
                  setActiveView("booking");
                } else if (nextRole === "admin") {
                  setActiveView("admin");
                } else {
                  setActiveView("driver");
                }
              }}
            />
          )}

          {role === "admin" && isAdmin && activeView === "dashboard" && (
            <>
              <StatsRow
                incidents={incidents}
                ambulances={ambulances}
                hospitals={hospitals}
              />
              <div className="panel-grid main-layout">
                <MapView
                  ambulances={ambulances}
                  hospitals={hospitals}
                  incidents={incidents}
                  resetAmbulancePositions={resetAmbulancePositions}
                />
                <IncidentPanel
                  incidents={incidents}
                  ambulances={ambulances}
                  hospitals={hospitals}
                  addIncident={addIncident}
                  updateIncidentStatus={updateIncidentStatus}
                  updateAmbulanceStatus={updateAmbulanceStatus}
                  updateAmbulanceLocation={updateAmbulanceLocation}
                  addNotification={addNotification}
                  clearForIncident={clearForIncident}
                />
              </div>
            </>
          )}

          {role === "admin" && isAdmin && activeView === "incidents" && (
            <>
              <StatsRow
                incidents={incidents}
                ambulances={ambulances}
                hospitals={hospitals}
              />
              <div className="panel-grid main-layout">
                <div>
                  <IncidentPanel
                    incidents={incidents}
                    ambulances={ambulances}
                    hospitals={hospitals}
                    addIncident={addIncident}
                    updateIncidentStatus={updateIncidentStatus}
                    updateAmbulanceStatus={updateAmbulanceStatus}
                    updateAmbulanceLocation={updateAmbulanceLocation}
                    addNotification={addNotification}
                    clearForIncident={clearForIncident}
                  />
                </div>
                <MapView
                  ambulances={ambulances}
                  hospitals={hospitals}
                  incidents={incidents}
                  resetAmbulancePositions={resetAmbulancePositions}
                />
              </div>
            </>
          )}

          {role === "admin" && isAdmin && activeView === "fleet" && (
            <FleetPanel
              ambulances={ambulances}
              updateAmbulanceStatus={updateAmbulanceStatus}
              setAllAmbulancesAvailable={setAllAmbulancesAvailable}
              deleteAmbulance={deleteAmbulance}
            />
          )}

          {role === "admin" && isAdmin && activeView === "hospitals" && (
            <HospitalPanel
              hospitals={hospitals}
              notifications={notifications}
              dismissNotification={dismissNotification}
            />
          )}

          {role === "admin" && isAdmin && activeView === "surge" && (
            <SurgePanel
              incidents={incidents}
              ambulances={ambulances}
              hospitals={hospitals}
            />
          )}

          {role === "admin" && isAdmin && activeView === "analytics" && (
            <AnalyticsPanel
              incidents={incidents}
              ambulances={ambulances}
              hospitals={hospitals}
            />
          )}

          {role === "user" && activeView === "booking" && (
            <BookingPortal
              addIncident={addIncident}
              ambulances={ambulances}
              hospitals={hospitals}
              incidents={incidents}
              onBack={handleBack}
            />
          )}

          {role === "driver" && activeView === "driver" && (
            <DriverConsole
              ambulances={ambulances}
              incidents={incidents}
              hospitals={hospitals}
              updateAmbulanceStatus={updateAmbulanceStatus}
              onBack={handleBack}
            />
          )}

          {role === "admin" && activeView === "admin" && (
            <AdminLogin
              isAdmin={isAdmin}
              onLoginSuccess={() => {
                setIsAdmin(true);
                setActiveView("dashboard");
              }}
              onGoToDashboard={() => setActiveView("dashboard")}
            />
          )}
        </main>
      </div>
    </div>
  );
}
