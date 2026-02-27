import { useState } from 'react';
import { Zap, Loader2, AlertTriangle, Clock, MapPin } from 'lucide-react';
import { handleSurge } from '../lib/praana-ai';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function SurgePanel({ incidents, ambulances, hospitals }) {
  const [surgeResponse, setSurgeResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const openIncidents = incidents.filter(i => i.status !== 'resolved');
  const sorted = [...openIncidents].sort((a, b) => {
    const pMap = { P1: 0, P2: 1, P3: 2 };
    return (pMap[a.priority] || 2) - (pMap[b.priority] || 2);
  });

  async function activateSurge() {
    setLoading(true);
    try {
      const response = await handleSurge(
        openIncidents,
        ambulances.filter(a => a.status === 'available'),
        hospitals
      );
      setSurgeResponse(response);
    } catch (err) {
      console.error('Surge analysis error:', err);
      setSurgeResponse('⚠️ Error running surge analysis. Check console.');
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="surge-header">
        <div className="surge-title">
          <Zap size={22} />
          SURGE MODE
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {openIncidents.length} active incidents
          </span>
          <button
            className="btn-emergency"
            onClick={activateSurge}
            disabled={loading || openIncidents.length === 0}
            style={{ fontSize: '0.75rem', padding: '8px 16px' }}
          >
            {loading ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
            {loading ? 'Analyzing…' : 'Run AI Analysis'}
          </button>
        </div>
      </div>

      <div className="section-header">
        <h3 className="section-title">Priority Queue</h3>
      </div>

      <div className="surge-queue">
        {sorted.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
            <span>No active incidents to prioritize</span>
          </div>
        ) : (
          sorted.map((inc, idx) => (
            <div className="surge-item" key={inc.id}>
              <span className="surge-rank">#{idx + 1}</span>
              <span className={`priority-badge ${inc.priority?.toLowerCase()}`}>{inc.priority}</span>
              <div className="surge-item-details">
                <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize' }}>
                  {inc.incident_type || 'Unknown'} — {inc.status}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {inc.caller_description?.slice(0, 100)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={10} /> {timeAgo(inc.created_at)}
                  {inc.location_raw && (<><MapPin size={10} /> {inc.location_raw}</>)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {surgeResponse && (
        <div className="surge-response">
          <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
            ⚡ AI Command Recommendations
          </div>
          {surgeResponse}
        </div>
      )}
    </div>
  );
}
