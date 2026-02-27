import { useState, useMemo } from 'react';
import { Send, Loader2, Clock, MapPin, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { triageEmergency, extractPuneCoords } from '../lib/praana-ai';
import { useNavigation } from '../hooks/useNavigation';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function IncidentPanel({ incidents, ambulances, hospitals, addIncident, updateIncidentStatus, updateAmbulanceStatus }) {
  const [description, setDescription] = useState('');
  const [triageResult, setTriageResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [latestIncidentId, setLatestIncidentId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { calculateETA } = useNavigation(ambulances, incidents, hospitals);

  const openIncidents = incidents.filter(i => i.status !== 'resolved');

  // Compute ETAs for open incidents that have an assigned ambulance
  const incidentEtas = useMemo(() => {
    const etas = {};
    incidents.filter(i => i.status === 'dispatched' && i.assigned_ambulance).forEach(inc => {
      const amb = ambulances.find(a => a.id === inc.assigned_ambulance);
      if (amb && amb.location_lat && inc.location_lat) {
        const result = calculateETA(amb.location_lat, amb.location_lng, inc.location_lat, inc.location_lng);
        if (result) etas[inc.id] = result.eta;
      }
    });
    return etas;
  }, [incidents, ambulances, calculateETA]);

  async function handleSubmit(e) {

    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setTriageResult(null);
    setLatestIncidentId(null);

    try {
      const result = await triageEmergency(description, ambulances, hospitals);
      setTriageResult(result);

          // Add incident to the system
          if (result.triage) {
              setSaving(true);
              // Try to extract Pune coords from description or AI result
              const extracted = extractPuneCoords(description);
              const location_lat = result.triage.location?.lat || extracted?.lat || (18.45 + Math.random() * 0.15);
              const location_lng = result.triage.location?.lng || extracted?.lng || (73.78 + Math.random() * 0.15);


          const newIncident = {
            priority: result.triage.priority,
            incident_type: result.triage.incident_type,
            status: 'open',
            caller_description: description,
            ai_triage_json: result.triage,
            location_raw: result.triage.location?.raw || description.slice(0, 100),
            location_lat,
            location_lng,
          };
          const saved = await addIncident(newIncident);
          if (saved) setLatestIncidentId(saved.id);
          setSaving(false);
        }
    } catch (err) {
      console.error('Triage error:', err);
      setSaving(false);
    }
    setLoading(false);
  }

  const handleDispatchNearest = (incident) => {
    const available = ambulances.filter(a => a.status === 'available');
    if (available.length > 0) {
      // Find nearest available ambulance
      let nearest = available[0];
      let minDistance = Infinity;
      
      available.forEach(amb => {
        const dist = Math.hypot(amb.location_lat - incident.location_lat, amb.location_lng - incident.location_lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearest = amb;
        }
      });

      updateIncidentStatus(incident.id, { 
        status: 'dispatched', 
        dispatched_at: new Date().toISOString(),
        assigned_ambulance: nearest.id 
      });
      updateAmbulanceStatus(nearest.id, 'dispatched');
      
      // Clear triage result and description after dispatch
      setTriageResult(null);
      setDescription('');
      setLatestIncidentId(null);
    } else {
      alert('No ambulances available! Bring one online or mark one available in Fleet panel.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Emergency Input */}
      <div className="emergency-input">
        <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--p1-color)' }}>
          📞 Incoming Emergency Call
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the emergency… e.g. 'Man collapsed near Shaniwar Wada, not breathing, appears to be in cardiac arrest. Bystanders performing CPR.'"
            disabled={loading}
            id="emergency-description"
          />
          <div className="emergency-input-actions">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              AI will auto-triage and recommend dispatch
            </span>
            <button type="submit" className="btn btn-primary" disabled={loading || !description.trim()} id="submit-triage-btn">
              {loading ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
              {saving ? 'Saving to Cloud…' : loading ? 'Analyzing…' : 'Triage & Dispatch'}
            </button>
          </div>
        </form>
      </div>

      {/* Triage Result */}
      {triageResult && (
        <div className="triage-result">
          <div className="triage-result-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontWeight: 700 }}>AI Triage Result</span>
              {triageResult.triage && (
                <span className={`priority-badge ${triageResult.triage.priority?.toLowerCase()}`}>
                  {triageResult.triage.priority}
                </span>
              )}
              {triageResult.source && (
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  via {triageResult.source}
                </span>
              )}
            </div>
            <button className="btn btn-sm" onClick={() => setShowJson(!showJson)}>
              {showJson ? 'Brief' : 'JSON'}
            </button>
          </div>

          {showJson && triageResult.triage ? (
            <pre className="triage-json">
              {JSON.stringify(triageResult.triage, null, 2)}
            </pre>
          ) : (
            <div className="dispatcher-brief">
              {triageResult.dispatcherBrief || triageResult.fullResponse}
            </div>
          )}

            {triageResult.triage?.first_aid_instructions && (
              <div style={{
                marginTop: 10,
                padding: '8px 12px',
                background: 'rgba(59, 130, 246, 0.08)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.78rem',
                color: 'var(--accent-blue)',
                border: '1px solid rgba(59, 130, 246, 0.15)'
              }}>
                <strong>📋 Relay to Caller:</strong> {triageResult.triage.first_aid_instructions}
              </div>
            )}

            {/* Nearest Driver Recommendation */}
            {(() => {
                const available = ambulances.filter(a => a.status === 'available');
                if (available.length > 0 && triageResult.triage?.location) {
                    const incLat = triageResult.triage.location.lat || (18.45 + Math.random() * 0.15);
                    const incLng = triageResult.triage.location.lng || (73.78 + Math.random() * 0.15);
                    
                    let nearest = available[0];
                    let minDistance = Infinity;
                    available.forEach(amb => {
                        const dist = Math.hypot(amb.location_lat - incLat, amb.location_lng - incLng);
                        if (dist < minDistance) {
                            minDistance = dist;
                            nearest = amb;
                        }
                    });

                    return (
                        <div style={{
                            marginTop: 10,
                            padding: '8px 12px',
                            background: 'rgba(34, 197, 94, 0.08)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.78rem',
                            color: 'var(--accent-green)',
                            border: '1px solid rgba(34, 197, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <strong>📍 Nearest Driver:</strong> {nearest.driver_name} ({nearest.unit_code})
                            </div>
                            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>READY TO DISPATCH</span>
                        </div>
                    );
                }
                return null;
            })()}

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              {latestIncidentId ? (
                <button 
                  className="btn btn-sm btn-primary" 
                  style={{ 
                    background: 'var(--accent-orange)', 
                    borderColor: 'var(--accent-orange)',
                    fontWeight: 700,
                    padding: '8px 16px',
                    boxShadow: '0 0 15px rgba(245, 158, 11, 0.4)'
                  }}
                  onClick={() => {
                    const incident = incidents.find(i => i.id === latestIncidentId);
                    if (incident) handleDispatchNearest(incident);
                  }}
                >
                  🚀 Dispatch Nearest Unit Now
                </button>
              ) : (
                <button className="btn btn-sm" onClick={() => { setTriageResult(null); setDescription(''); }}>
                  ✓ Accept & Clear
                </button>
              )}
            </div>


        </div>
      )}

      {/* Incident List */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
            Active Incidents ({openIncidents.length})
          </span>
          <button 
            className="btn btn-sm" 
            style={{ fontSize: '10px', height: 24, padding: '0 8px' }}
            onClick={() => {
              // Quick hack to inject a traffic-heavy P1 incident for testing
              const amb = ambulances.find(a => a.status === 'available');
              if (amb) {
                addIncident({
                  priority: 'P1',
                  incident_type: 'traffic-jam',
                  status: 'open',
                  caller_description: 'HEAVY TRAFFIC SIMULATION: This area is now highly congested.',
                  location_lat: amb.location_lat + 0.01,
                  location_lng: amb.location_lng + 0.01,
                  location_raw: 'Traffic Simulation Zone'
                });
              }
            }}
          >
            🚧 Simulate Traffic
          </button>
        </div>

      <div className="incident-list">
        {openIncidents.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: '2rem', marginBottom: 8 }}>✅</span>
            <span>No active incidents</span>
          </div>
        ) : (
          openIncidents.map(inc => (
            <div
              key={inc.id}
              className={`incident-card ${expandedId === inc.id ? 'selected' : ''}`}
              onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
            >
              <div className="incident-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`priority-badge ${inc.priority?.toLowerCase()}`}>{inc.priority}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {inc.incident_type || 'Unknown'}
                  </span>
                </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {incidentEtas[inc.id] && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--p1-color)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Zap size={10} fill="currentColor" /> {incidentEtas[inc.id]}m
                      </span>
                    )}
                    <span className={`status-badge ${inc.status}`}>{inc.status}</span>
                    {expandedId === inc.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>

              </div>

              <div className="incident-card-body">
                {inc.caller_description?.slice(0, 120)}{inc.caller_description?.length > 120 ? '…' : ''}
              </div>

              <div className="incident-meta">
                <Clock size={11} />
                <span>{timeAgo(inc.created_at)}</span>
                {inc.location_raw && (
                  <>
                    <MapPin size={11} />
                    <span>{inc.location_raw}</span>
                  </>
                )}
              </div>

                  {expandedId === inc.id && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border-default)', display: 'flex', gap: 8 }}>
                      {inc.status === 'open' && (
                          <button className="btn btn-sm btn-primary" onClick={(e) => { 
                            e.stopPropagation(); 
                            handleDispatchNearest(inc);
                          }}>
                            Dispatch Nearest Unit
                          </button>

                      )}
                      {inc.status === 'dispatched' && (
                        <button className="btn btn-sm" onClick={(e) => { 
                          e.stopPropagation(); 
                          updateIncidentStatus(inc.id, { status: 'resolved', resolved_at: new Date().toISOString() });
                          if (inc.assigned_ambulance) {
                            updateAmbulanceStatus(inc.assigned_ambulance, 'returning');
                          }
                        }}>
                          Resolve & Release
                        </button>
                      )}
                    </div>
                  )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
