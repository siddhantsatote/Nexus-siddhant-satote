import { useState } from 'react';
import { AlertTriangle, Truck, Building2, Activity } from 'lucide-react';
import './index.css';
import { useRealtimeData } from './hooks/useRealtimeData';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MapView from './components/MapView';
import IncidentPanel from './components/IncidentPanel';
import FleetPanel from './components/FleetPanel';
import HospitalPanel from './components/HospitalPanel';
import SurgePanel from './components/SurgePanel';
import CallLogsPanel from './components/CallLogsPanel';

function StatsRow({ incidents, ambulances, hospitals }) {
  const p1 = incidents.filter(i => i.priority === 'P1' && i.status !== 'resolved').length;
  const p2 = incidents.filter(i => i.priority === 'P2' && i.status !== 'resolved').length;
  const available = ambulances.filter(a => a.status === 'available').length;
  const totalIcu = hospitals.reduce((s, h) => s + (h.icu_beds_available || 0), 0);

  return (
    <div className="stats-row">
      <div className="stat-card">
        <div className="stat-icon red"><AlertTriangle size={20} /></div>
        <div>
          <div className="stat-value">{p1}</div>
          <div className="stat-label">Critical (P1)</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon yellow"><Activity size={20} /></div>
        <div>
          <div className="stat-value">{p2}</div>
          <div className="stat-label">Urgent (P2)</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon green"><Truck size={20} /></div>
        <div>
          <div className="stat-value">{available}</div>
          <div className="stat-label">Available Units</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon blue"><Building2 size={20} /></div>
        <div>
          <div className="stat-value">{totalIcu}</div>
          <div className="stat-label">ICU Beds</div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const {
    ambulances, hospitals, incidents, callLogs, loading, usingDemo,
    addIncident, updateAmbulanceStatus, updateIncidentStatus, setAllAmbulancesAvailable
  } = useRealtimeData();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Initializing PRAANA Command Center…
        </div>
      </div>
    );
  }

  function handleNewEmergency() {
    setActiveView('incidents');
    // Also focus the emergency textarea
    setTimeout(() => {
      const el = document.getElementById('emergency-description');
      if (el) el.focus();
    }, 100);
  }

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        incidents={incidents}
        usingDemo={usingDemo}
      />

      <div className="main-wrapper">
        <TopBar
          incidents={incidents}
          ambulances={ambulances}
          hospitals={hospitals}
          onNewEmergency={handleNewEmergency}
        />

        <main className="main-content">
          {activeView === 'dashboard' && (
            <>
              <StatsRow incidents={incidents} ambulances={ambulances} hospitals={hospitals} />
              <div className="panel-grid main-layout">
                <MapView ambulances={ambulances} hospitals={hospitals} incidents={incidents} />
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

          {activeView === 'incidents' && (
            <>
              <StatsRow incidents={incidents} ambulances={ambulances} hospitals={hospitals} />
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
                <MapView ambulances={ambulances} hospitals={hospitals} incidents={incidents} />
              </div>
            </>
          )}

          {activeView === 'fleet' && (
            <FleetPanel ambulances={ambulances} updateAmbulanceStatus={updateAmbulanceStatus} setAllAmbulancesAvailable={setAllAmbulancesAvailable} />
          )}

          {activeView === 'calls' && (
            <CallLogsPanel 
              callLogs={callLogs} 
              incidents={incidents}
              onCreateIncident={addIncident}
            />
          )}

          {activeView === 'hospitals' && (
            <HospitalPanel hospitals={hospitals} />
          )}

          {activeView === 'surge' && (
            <SurgePanel incidents={incidents} ambulances={ambulances} hospitals={hospitals} />
          )}
        </main>
      </div>
    </div>
  );
}
