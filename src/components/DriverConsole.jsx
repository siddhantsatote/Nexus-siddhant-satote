import { useMemo, useState } from "react";
import { User, Phone, MapPin, Activity, AlertTriangle, Lock } from "lucide-react";
import MapView from "./MapView";

export default function DriverConsole({
  ambulances,
  incidents,
  hospitals,
  updateAmbulanceStatus,
  onBack,
}) {
  const [selectedId, setSelectedId] = useState("");
  const [driverAuthed, setDriverAuthed] = useState(false);
  const [unitCode, setUnitCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const selectedAmbulance = useMemo(
    () => ambulances.find((a) => a.id === selectedId),
    [ambulances, selectedId],
  );

  const activeIncident = useMemo(() => {
    if (!selectedAmbulance) return null;
    return (
      incidents.find(
        (i) => i.assigned_ambulance === selectedAmbulance.id && i.status !== "resolved",
      ) || null
    );
  }, [incidents, selectedAmbulance]);

  const nearestHospital = useMemo(() => {
    if (!activeIncident || !activeIncident.location_lat || !activeIncident.location_lng) {
      return null;
    }
    let best = null;
    let bestDist = Infinity;
    hospitals.forEach((h) => {
      if (!h.location_lat || !h.location_lng) return;
      const d = Math.hypot(
        h.location_lat - activeIncident.location_lat,
        h.location_lng - activeIncident.location_lng,
      );
      if (d < bestDist) {
        bestDist = d;
        best = h;
      }
    });
    return best;
  }, [activeIncident, hospitals]);

  function handleLogin(e) {
    e.preventDefault();
    const cleanUnit = unitCode.trim().toLowerCase();
    const cleanPin = pin.trim();
    if (!cleanUnit || !cleanPin) return;

    const match = ambulances.find((a) => {
      const phoneDigits = (a.driver_phone || "").replace(/\D/g, "");
      return (
        a.unit_code.toLowerCase() === cleanUnit &&
        phoneDigits.endsWith(cleanPin)
      );
    });

    if (!match) {
      setError("Could not verify unit code / PIN. Try again.");
      return;
    }

    setSelectedId(match.id);
    setDriverAuthed(true);
    setError("");
  }

  function handleCycleStatus() {
    if (!selectedAmbulance) return;
    const current = selectedAmbulance.status;
    const next =
      current === "available"
        ? "dispatched"
        : current === "dispatched"
        ? "returning"
        : current === "returning"
        ? "available"
        : "available";
    updateAmbulanceStatus(selectedAmbulance.id, next);
  }

  return (
    <div className="driver-container">
      <div className="driver-shell">
        <header className="driver-header">
          <div>
            <h2>Driver console</h2>
            <p>
              Lightweight view for on-road crew to see their unit, job and route.
            </p>
          </div>
          {onBack && (
            <button
              type="button"
              className="back-btn"
              style={{ margin: 0 }}
              onClick={onBack}
            >
              ← Back
            </button>
          )}
        </header>

        {!driverAuthed && (
          <section className="driver-card">
            <div className="driver-subheader" style={{ marginBottom: 8 }}>
              <h3>
                <Lock size={14} style={{ marginRight: 6 }} />
                Driver login
              </h3>
            </div>
            <form
              onSubmit={handleLogin}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div className="input-group">
                <label>Unit code</label>
                <input
                  className="input-field"
                  placeholder="e.g. PUN-A3"
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>Access PIN</label>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Last 4 digits of driver mobile"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                />
              </div>
              {error && <div className="admin-error">{error}</div>}
              <button type="submit" className="btn btn-primary w-full">
                Login to my unit
              </button>
              <p className="admin-hint">
                Demo: use the unit code from Fleet and the last 4 digits of that
                driver&apos;s phone.
              </p>
            </form>
          </section>
        )}

        {driverAuthed && selectedAmbulance ? (
          <>
            <section className="driver-card driver-card-main">
              <div className="driver-unit-header">
                <div className="driver-unit-id">
                  <span>{selectedAmbulance.unit_code}</span>
                  <span
                    className={`type-badge ${selectedAmbulance.type?.toLowerCase()}`}
                  >
                    {selectedAmbulance.type}
                  </span>
                </div>
                <span
                  className={`status-badge ${selectedAmbulance.status || "available"}`}
                >
                  {selectedAmbulance.status}
                </span>
              </div>
              <div className="driver-unit-meta">
                <span>
                  <User size={14} /> {selectedAmbulance.driver_name}
                </span>
                <span>
                  <Phone size={14} /> {selectedAmbulance.driver_phone}
                </span>
                <span>
                  <MapPin size={14} /> {selectedAmbulance.zone}
                </span>
              </div>
              <div className="driver-actions">
                <button className="btn btn-primary w-full" onClick={handleCycleStatus}>
                  Update status
                </button>
                <p className="driver-actions-hint">
                  Available → Dispatched → Returning → Available
                </p>
              </div>
            </section>

            <section className="driver-card">
              <div className="driver-subheader">
                <h3>Current job</h3>
              </div>
              {activeIncident ? (
                <div className="driver-incident">
                  <div className="driver-incident-row">
                    <span
                      className={`priority-badge ${activeIncident.priority?.toLowerCase()}`}
                    >
                      <AlertTriangle size={12} />
                      {activeIncident.priority}
                    </span>
                    <span className={`status-badge ${activeIncident.status}`}>
                      {activeIncident.status}
                    </span>
                  </div>
                  <p className="driver-incident-text">
                    {activeIncident.caller_description}
                  </p>
                  <div className="driver-incident-meta">
                    <span>
                      <MapPin size={13} /> {activeIncident.location_raw}
                    </span>
                    <span>
                      <Activity size={13} /> {activeIncident.incident_type}
                    </span>
                    {nearestHospital && (
                      <span>
                        <MapPin size={13} /> Nearest hospital: {nearestHospital.name}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="driver-empty">
                  <Activity className="icon" size={24} />
                  <p>No active incident assigned to this unit.</p>
                </div>
              )}
            </section>

            <section className="driver-card" style={{ marginTop: 8 }}>
              <div className="driver-subheader">
                <h3>Map view</h3>
              </div>
              <div style={{ height: 260 }}>
                <MapView
                  ambulances={selectedAmbulance ? [selectedAmbulance] : []}
                  hospitals={hospitals}
                  incidents={activeIncident ? [activeIncident] : []}
                />
              </div>
            </section>
          </>
        ) : (
          driverAuthed && (
            <section className="driver-card driver-empty">
              <Activity className="icon" size={24} />
              <p>No unit found for this login.</p>
            </section>
          )
        )}
      </div>
    </div>
  );
}

