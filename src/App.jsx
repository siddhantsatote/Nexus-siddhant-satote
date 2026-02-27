import { useState } from "react";
import {
  AlertTriangle,
  Truck,
  Building2,
  Activity,
  ShieldCheck,
} from "lucide-react";
import "./index.css";
import { useRealtimeData } from "./hooks/useRealtimeData";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import MapView from "./components/MapView";
import IncidentPanel from "./components/IncidentPanel";
import FleetPanel from "./components/FleetPanel";
import HospitalPanel from "./components/HospitalPanel";
import SurgePanel from "./components/SurgePanel";
import BookingPortal from "./components/BookingPortal";
import DriverConsole from "./components/DriverConsole";

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

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-icon red">
          <AlertTriangle size={20} />
        </div>
        <div>
          <div className="stat-value">{p1}</div>
          <div className="stat-label">Critical (P1)</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon yellow">
          <Activity size={20} />
        </div>
        <div>
          <div className="stat-value">{p2}</div>
          <div className="stat-label">Urgent (P2)</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon green">
          <Truck size={20} />
        </div>
        <div>
          <div className="stat-value">{available}</div>
          <div className="stat-label">Available Units</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon blue">
          <Building2 size={20} />
        </div>
        <div>
          <div className="stat-value">{totalIcu}</div>
          <div className="stat-label">ICU Beds</div>
        </div>
      </div>
    </div>
  );
}

function Landing({ onSelectRole }) {
  return (
    <div className="landing-shell">
      <div className="landing-frame">
        <main className="landing-main">
          <div className="landing-pill">PRAANA · Emergency Network</div>
          <h1 className="landing-title">
            One-click for{" "}
            <span className="landing-gradient">city-wide ambulance response</span>
          </h1>
          <p className="landing-subtitle">
            A single pane of glass for citizens, control rooms and on-road
            drivers — without exposing their consoles to each other.
          </p>

          <div className="landing-role-buttons">
            <button
              className="btn btn-primary btn-large"
              onClick={() => onSelectRole("user")}
            >
              Book ambulance
            </button>
            <button
              className="btn btn-outline btn-large"
              onClick={() => onSelectRole("admin")}
            >
              <ShieldCheck size={16} />
              Admin console
            </button>
            <button
              className="btn btn-outline btn-large"
              onClick={() => onSelectRole("driver")}
            >
              Driver login
            </button>
          </div>

          <div className="landing-meta-row">
            <span>Live Pune demo • <span className="dot-live" /> Status: healthy</span>
            <span>Sub-10s dispatch, ICU-aware routing, surge load AI</span>
          </div>
        </main>

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
    updateIncidentStatus,
    setAllAmbulancesAvailable,
  } = useRealtimeData();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          Initializing PRAANA Command Center…
        </div>
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
      nextView === "surge"
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
          usingDemo={usingDemo}
          isAdmin={isAdmin}
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
                />
                <IncidentPanel
                  incidents={incidents}
                  ambulances={ambulances}
                  hospitals={hospitals}
                  addIncident={addIncident}
                  updateIncidentStatus={updateIncidentStatus}
                  updateAmbulanceStatus={updateAmbulanceStatus}
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
                  />
                </div>
                <MapView
                  ambulances={ambulances}
                  hospitals={hospitals}
                  incidents={incidents}
                />
              </div>
            </>
          )}

          {role === "admin" && isAdmin && activeView === "fleet" && (
            <FleetPanel
              ambulances={ambulances}
              updateAmbulanceStatus={updateAmbulanceStatus}
              setAllAmbulancesAvailable={setAllAmbulancesAvailable}
            />
          )}

          {role === "admin" && isAdmin && activeView === "hospitals" && (
            <HospitalPanel hospitals={hospitals} />
          )}

          {role === "admin" && isAdmin && activeView === "surge" && (
            <SurgePanel
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
