import { useState, useMemo } from 'react';
import { Send, Loader2, Clock, MapPin, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { triageEmergency, extractPuneCoords } from '../lib/praana-ai';
import { fetchRoute } from '../lib/externalMaps';
import { useNavigation } from '../hooks/useNavigation';
import { startAmbulanceMovement } from '../lib/ambulanceSimulation';
import { haversineDistance } from '../lib/navigation';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function IncidentPanel({ incidents, ambulances, hospitals, addIncident, updateIncidentStatus, updateAmbulanceStatus, updateAmbulanceLocation }) {
  const [description, setDescription] = useState('');
  const [triageResult, setTriageResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [latestIncidentId, setLatestIncidentId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isAutoDispatchEnabled, setIsAutoDispatchEnabled] = useState(true);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualData, setManualData] = useState({
    location: '',
    category: 'accident',
    priority: 'P2'
  });
  const { calculateETA } = useNavigation(ambulances, incidents, hospitals);

  const openIncidents = incidents.filter(i => i.status !== 'resolved');

  const [incidentEtas, setIncidentEtas] = useState({});

  // Compute ETAs for dispatched incidents
  useMemo(async () => {
    const etas = {};
    const dispatched = incidents.filter(i => i.status === 'dispatched' && i.assigned_ambulance);
    for (const inc of dispatched) {
      const amb = ambulances.find(a => a.id === inc.assigned_ambulance);
      if (amb?.location_lat && inc.location_lat) {
        const result = await calculateETA(amb.location_lat, amb.location_lng, inc.location_lat, inc.location_lng);
        if (result) etas[inc.id] = result.eta;
      }
    }
    setIncidentEtas(etas);
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
          if (saved) {
            setLatestIncidentId(saved.id);
            if (isAutoDispatchEnabled) {
              handleDispatchNearest(saved);
            }
          }
          setSaving(false);
        }
    } catch (err) {
      console.error('Triage error:', err);
      setSaving(false);
    }
    setLoading(false);
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    if (!manualData.location.trim()) return;

    setLoading(true);
    try {
      const extracted = extractPuneCoords(manualData.location);
      const location_lat = extracted?.lat || (18.45 + Math.random() * 0.15);
      const location_lng = extracted?.lng || (73.78 + Math.random() * 0.15);

      const newIncident = {
        priority: manualData.priority,
        incident_type: manualData.category,
        status: 'open',
        caller_description: `[Manual Entry] ${manualData.location}`,
        location_raw: manualData.location,
        location_lat,
        location_lng,
      };

      const saved = await addIncident(newIncident);
      if (saved) {
        setManualData({ location: '', category: 'accident', priority: 'P2' });
        if (isAutoDispatchEnabled) {
          handleDispatchNearest(saved);
        }
      }
    } catch (err) {
      console.error('Manual entry error:', err);
    }
    setLoading(false);
  }

  /**
   * Weighted multi-factor dispatch scoring algorithm.
   * Scores each ambulance on: distance (50%), type match (30%), zone familiarity (20%).
   * Hospital matching uses: distance (40%), ICU beds (25%), trauma (20%), cardiac cath (15%).
   */
  const handleDispatchNearest = (incident) => {
    // 1. Guard: Don't dispatch if already dispatched or assigned
    if (incident.status === 'dispatched' || incident.status === 'enroute' || incident.status === 'on-site' || incident.assigned_ambulance) {
      console.warn(`Incident ${incident.id} is already dispatched/assigned. Ignoring redundant call.`);
      return;
    }

    // 2. CRITICAL: Prevent assigning the same ambulance/driver to multiple active incidents
    const busyAmbulanceIds = new Set();
    
    incidents.forEach(inc => {
      if ((inc.status === 'dispatched' || 
           inc.status === 'enroute' || 
           inc.status === 'on-site' ||
           inc.status === 'returning') && 
          inc.assigned_ambulance) {
        busyAmbulanceIds.add(inc.assigned_ambulance);
      }
    });

    // 3. Filter available ambulances - must be "available" status AND not in busy set
    const available = ambulances.filter(a => {
      const isAvailableStatus = a.status === 'available';
      const isNotBusy = !busyAmbulanceIds.has(a.id);
      return isAvailableStatus && isNotBusy;
    });
    
    if (available.length > 0) {
      // ── Weighted Multi-Factor Dispatch Scoring ──
      // Weights: Distance 50% | Type Match 30% | Zone Familiarity 20%
      const W_DIST = 0.50, W_TYPE = 0.30, W_ZONE = 0.20;
      
      const distances = available.map(a => 
        haversineDistance(a.location_lat, a.location_lng, incident.location_lat, incident.location_lng)
      );
      const maxDist = Math.max(...distances, 0.1); // avoid div-by-zero

      const scoredAmbulances = available.map((a, i) => {
        // Distance score: closer = higher (inverted, normalized 0-1)
        const distScore = 1 - (distances[i] / maxDist);
        
        // Type match score: ALS for P1, BLS for P2/P3
        let typeScore = 0.5; // neutral
        if (incident.priority === 'P1' && a.type === 'ALS') typeScore = 1.0;
        else if (incident.priority === 'P1' && a.type !== 'ALS') typeScore = 0.1;
        else if (incident.priority !== 'P1' && a.type === 'BLS') typeScore = 0.9;
        else if (incident.priority !== 'P1' && a.type === 'ALS') typeScore = 0.6; // ALS is over-qualified but fine
        
        // Zone familiarity: bonus if ambulance zone matches incident area
        const incidentArea = (incident.location_raw || '').toLowerCase();
        const ambZone = (a.zone || '').toLowerCase();
        const zoneScore = incidentArea.includes(ambZone) || ambZone.includes(incidentArea.split(' ')[0]) ? 1.0 : 0.3;
        
        const totalScore = (distScore * W_DIST) + (typeScore * W_TYPE) + (zoneScore * W_ZONE);
        
        return { ambulance: a, score: totalScore, distKm: distances[i] };
      });

      scoredAmbulances.sort((a, b) => b.score - a.score);
      const nearest = scoredAmbulances[0].ambulance;
      
      console.info(`🔢 Dispatch scoring: Top pick ${nearest.unit_code} (score: ${scoredAmbulances[0].score.toFixed(3)}, dist: ${scoredAmbulances[0].distKm.toFixed(2)}km)`);
      if (scoredAmbulances.length > 1) {
        console.debug(`   Runner-up: ${scoredAmbulances[1].ambulance.unit_code} (score: ${scoredAmbulances[1].score.toFixed(3)})`);
      }

      // ── Composite Hospital Matching ──
      // Weights: Distance 40% | ICU Beds 25% | Trauma Capability 20% | Cardiac Cath 15%
      const H_DIST = 0.40, H_ICU = 0.25, H_TRAUMA = 0.20, H_CARDIAC = 0.15;
      
      const availableHospitals = hospitals.filter(h => h.location_lat && h.location_lng);
      let bestHospital = null;
      
      if (availableHospitals.length > 0) {
        const hospDistances = availableHospitals.map(h => 
          haversineDistance(h.location_lat, h.location_lng, incident.location_lat, incident.location_lng)
        );
        const maxHospDist = Math.max(...hospDistances, 0.1);
        const maxIcu = Math.max(...availableHospitals.map(h => h.icu_beds_available || 0), 1);

        const scoredHospitals = availableHospitals.map((h, i) => {
          const distScore = 1 - (hospDistances[i] / maxHospDist);
          const icuScore = (h.icu_beds_available || 0) / maxIcu;
          const traumaScore = h.trauma_capable ? 1.0 : 0.0;
          const cardiacScore = (incident.incident_type === 'cardiac' && h.cardiac_cath) ? 1.0 : 
                               h.cardiac_cath ? 0.5 : 0.0;
          
          const total = (distScore * H_DIST) + (icuScore * H_ICU) + (traumaScore * H_TRAUMA) + (cardiacScore * H_CARDIAC);
          return { hospital: h, score: total, distKm: hospDistances[i] };
        });

        scoredHospitals.sort((a, b) => b.score - a.score);
        bestHospital = scoredHospitals[0].hospital;
        console.info(`🏥 Hospital match: ${bestHospital.name} (score: ${scoredHospitals[0].score.toFixed(3)}, dist: ${scoredHospitals[0].distKm.toFixed(2)}km)`);
      }

      updateAmbulanceStatus(nearest.id, 'dispatched');
      
      // Fetch both routes (Amb->Inc and Inc->Hosp) for stable mapping
      console.log(`🚑 Initializing stable routes for ${nearest.unit_code}...`);
      
      const startLocation = [nearest.location_lat, nearest.location_lng];
      const incidentPos = [incident.location_lat, incident.location_lng];
      const hospPos = bestHospital ? [bestHospital.location_lat, bestHospital.location_lng] : null;

      Promise.all([
        fetchRoute(startLocation, incidentPos),
        hospPos ? fetchRoute(incidentPos, hospPos) : Promise.resolve(null)
      ]).then(([ambRoute, hospRoute]) => {
        const dispatchPath = ambRoute?.geometry || null;
        const hospitalPath = hospRoute?.geometry || null;
        
        // Update incident with stable routes
        updateIncidentStatus(incident.id, { 
          status: 'dispatched', 
          dispatched_at: new Date().toISOString(),
          assigned_ambulance: nearest.id,
          assigned_hospital: bestHospital?.id || null,
          dispatch_route: dispatchPath,
          hospital_route: hospitalPath
        });

        const durationSeconds = ambRoute?.duration 
          ? Math.max(30, Math.ceil(ambRoute.duration / 3)) // Factor of 3 for demo simulation speed
          : Math.max(60, Math.ceil(Math.hypot(incidentPos[0] - startLocation[0], incidentPos[1] - startLocation[1]) * 111 / 0.9 * 60));

        console.log(`🚑 Starting path-following simulation for ${nearest.unit_code}`);
        
        startAmbulanceMovement(
          nearest.id,
          nearest.location_lat,
          nearest.location_lng,
          incident.location_lat,
          incident.location_lng,
          updateAmbulanceLocation,
          durationSeconds,
          1500, // Update every 1.5 seconds
          dispatchPath
        ).then(() => {
          console.log(`✓ Ambulance ${nearest.unit_code} reached incident location`);
          updateIncidentStatus(incident.id, { status: 'on-site' });
        });
      });
      
      // Clear triage result and description after dispatch
      setTriageResult(null);
      setDescription('');
      setLatestIncidentId(null);
    } else if (!isAutoDispatchEnabled) {
      alert('No ambulances available! Bring one online or mark one available in Fleet panel.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Mode Toggle */}
      <div className="panel-tabs" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          <button 
            className={`tab-btn ${!isManualMode ? 'active' : ''}`}
            onClick={() => setIsManualMode(false)}
          >
            AI Coordinator
          </button>
          <button 
            className={`tab-btn ${isManualMode ? 'active' : ''}`}
            onClick={() => setIsManualMode(true)}
          >
            Manual Entry
          </button>
        </div>
        
        <div 
          onClick={() => setIsAutoDispatchEnabled(!isAutoDispatchEnabled)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6, 
            cursor: 'pointer',
            padding: '4px 8px',
            background: isAutoDispatchEnabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
            borderRadius: 6,
            transition: 'all 0.2s'
          }}
        >
          <div style={{ 
            width: 8, height: 8, 
            borderRadius: '50%', 
            background: isAutoDispatchEnabled ? 'var(--accent-green)' : 'var(--text-muted)',
            boxShadow: isAutoDispatchEnabled ? '0 0 8px var(--accent-green)' : 'none'
          }}></div>
          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isAutoDispatchEnabled ? 'var(--accent-green)' : 'var(--text-muted)' }}>
            AUTO-DISPATCH: {isAutoDispatchEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Emergency Input */}
      {!isManualMode ? (
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
      ) : (
        <div className="emergency-input">
          <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)' }}>
            📝 Rapid Incident Entry
          </div>
          <form onSubmit={handleManualSubmit}>
            <div style={{ display: 'grid', gap: 10 }}>
              <input
                type="text"
                className="input-field"
                placeholder="Location (e.g. Hinjewadi, Camp)"
                value={manualData.location}
                onChange={(e) => setManualData({ ...manualData, location: e.target.value })}
                required
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <select 
                  className="input-field"
                  value={manualData.category}
                  onChange={(e) => setManualData({ ...manualData, category: e.target.value })}
                  style={{ flex: 1 }}
                >
                  <option value="cardiac">Cardiac</option>
                  <option value="trauma">Trauma</option>
                  <option value="accident">Accident</option>
                  <option value="burns">Burns</option>
                  <option value="respiratory">Respiratory</option>
                  <option value="other">Other</option>
                </select>
                <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 2 }}>
                  {['P1', 'P2', 'P3'].map(p => (
                    <button
                      key={p}
                      type="button"
                      className={`btn btn-sm ${manualData.priority === p ? 'btn-primary' : ''}`}
                      style={{ 
                        padding: '4px 10px', 
                        fontSize: '0.7rem',
                        background: manualData.priority === p ? `var(--${p.toLowerCase()}-bg)` : 'transparent',
                        color: manualData.priority === p ? `var(--${p.toLowerCase()}-color)` : 'var(--text-muted)',
                        borderColor: 'transparent'
                      }}
                      onClick={() => setManualData({ ...manualData, priority: p })}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading || !manualData.location.trim()} style={{ background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' }}>
                {loading ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
                Add Incident
              </button>
            </div>
          </form>
        </div>
      )}

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
                      {['dispatched', 'enroute', 'on-site'].includes(inc.status) && (
                        <button className="btn btn-sm" onClick={(e) => { 
                          e.stopPropagation(); 
                          const ambId = inc.assigned_ambulance;
                          const amb = ambulances.find(a => a.id === ambId);
                          
                          updateIncidentStatus(inc.id, { status: 'resolved', resolved_at: new Date().toISOString() });
                          
                          if (ambId) {
                            updateAmbulanceStatus(ambId, 'returning');
                            
                            // Trigger return-to-base simulation
                            if (amb && amb.base_lat && amb.base_lng) {
                              console.log(`🚑 Triggering return-to-base for ${amb.unit_code}...`);
                              
                              fetchRoute([amb.location_lat, amb.location_lng], [amb.base_lat, amb.base_lng]).then(routeData => {
                                const path = routeData?.geometry || null;
                                const durationSeconds = routeData?.duration 
                                  ? Math.max(30, Math.ceil(routeData.duration / 3))
                                  : 60;

                                startAmbulanceMovement(
                                  ambId,
                                  amb.location_lat,
                                  amb.location_lng,
                                  amb.base_lat,
                                  amb.base_lng,
                                  updateAmbulanceLocation,
                                  durationSeconds,
                                  2000,
                                  path
                                ).then(() => {
                                  console.log(`✓ Ambulance ${amb.unit_code} returned to base`);
                                  updateAmbulanceStatus(ambId, 'available');
                                });
                              });
                            }
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
