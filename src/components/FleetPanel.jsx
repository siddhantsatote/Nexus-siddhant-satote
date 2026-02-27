import { useState } from 'react';
import { User, Phone, MapPin, Radio } from 'lucide-react';

export default function FleetPanel({ ambulances, updateAmbulanceStatus }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? ambulances
    : ambulances.filter(a => a.status === filter);

  const counts = {
    all: ambulances.length,
    available: ambulances.filter(a => a.status === 'available').length,
    dispatched: ambulances.filter(a => a.status === 'dispatched').length,
    returning: ambulances.filter(a => a.status === 'returning').length,
    offline: ambulances.filter(a => a.status === 'offline').length,
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🚑 Fleet Management</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {counts.available} of {counts.all} units available
        </span>
      </div>

      <div className="filter-bar">
        {Object.entries(counts).map(([key, count]) => (
          <button
            key={key}
            className={`filter-btn ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)} ({count})
          </button>
        ))}
      </div>

      <div className="fleet-grid">
        {filtered.map(amb => (
          <div className="fleet-card" key={amb.id}>
            <div className="fleet-card-header">
              <div className="fleet-card-title">
                <span>{amb.unit_code}</span>
                <span className={`type-badge ${amb.type?.toLowerCase()}`}>{amb.type}</span>
              </div>
              <span className={`status-badge ${amb.status}`}>{amb.status}</span>
            </div>
            <div className="fleet-card-info">
              <span><User size={13} /> {amb.driver_name}</span>
              <span><Phone size={13} /> {amb.driver_phone}</span>
              <span><MapPin size={13} /> {amb.zone}</span>
              <span><Radio size={13} /> Unit Active</span>
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              {amb.status === 'available' && (
                <button className="btn btn-sm" onClick={() => updateAmbulanceStatus(amb.id, 'dispatched')}>
                  Dispatch
                </button>
              )}
              {amb.status === 'dispatched' && (
                <button className="btn btn-sm" onClick={() => updateAmbulanceStatus(amb.id, 'returning')}>
                  Mark Returning
                </button>
              )}
              {amb.status === 'returning' && (
                <button className="btn btn-sm" onClick={() => updateAmbulanceStatus(amb.id, 'available')}>
                  Mark Available
                </button>
              )}
              {amb.status === 'offline' && (
                <button className="btn btn-sm" onClick={() => updateAmbulanceStatus(amb.id, 'available')}>
                  Bring Online
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
