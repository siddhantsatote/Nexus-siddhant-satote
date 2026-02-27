import { Phone, AlertCircle, Activity, Truck, Building2, ArrowLeft } from 'lucide-react';

export default function TopBar({ incidents, ambulances, hospitals, onNewEmergency, onBack }) {
  const openIncidents = incidents.filter(i => i.status === 'open').length;
  const p1Count = incidents.filter(i => i.priority === 'P1' && i.status !== 'resolved').length;
  const availableAmb = ambulances.filter(a => a.status === 'available').length;
  const totalBeds = hospitals.reduce((s, h) => s + (h.icu_beds_available || 0), 0);

  return (
    <header className="topbar">
      <div className="topbar-left">
        {onBack && (
          <button className="btn btn-sm" onClick={onBack}>
            <ArrowLeft size={14} />
            Back
          </button>
        )}
        <button className="btn-emergency" onClick={onNewEmergency} id="new-emergency-btn">
          <Phone size={16} />
          New Emergency
        </button>
        <span className="topbar-title">Command Center</span>
      </div>

      <div className="topbar-right">
        <div className="stat-chip critical">
          <AlertCircle size={14} />
          <span className="count">{p1Count}</span>
          <span>P1</span>
        </div>
        <div className="stat-chip warning">
          <Activity size={14} />
          <span className="count">{openIncidents}</span>
          <span>Open</span>
        </div>
        <div className="stat-chip ok">
          <Truck size={14} />
          <span className="count">{availableAmb}</span>
          <span>Avail</span>
        </div>
        <div className="stat-chip">
          <Building2 size={14} />
          <span className="count">{totalBeds}</span>
          <span>ICU</span>
        </div>
      </div>
    </header>
  );
}
