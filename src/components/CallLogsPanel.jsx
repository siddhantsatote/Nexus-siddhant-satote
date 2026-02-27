import { useState } from 'react';
import { Phone, Clock, MapPin, User, ChevronDown, ChevronUp, AlertCircle, PhoneIncoming } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function CallLogsPanel({ callLogs = [], incidents, onCreateIncident }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' 
    ? callLogs 
    : callLogs.filter(c => c.priority === filter);

  const counts = {
    all: callLogs.length,
    P1: callLogs.filter(c => c.priority === 'P1').length,
    P2: callLogs.filter(c => c.priority === 'P2').length,
    P3: callLogs.filter(c => c.priority === 'P3').length,
  };

  const handleCreateIncident = (call) => {
    if (onCreateIncident) {
      onCreateIncident({
        priority: call.priority || 'P3',
        incident_type: call.incident_type || 'other',
        status: 'open',
        caller_description: call.transcript || call.summary || 'From AI Call',
        location_raw: call.location_raw || '',
        ai_triage_json: {
          source: 'vapi_call',
          call_id: call.vapi_call_id,
          caller_phone: call.caller_phone,
          caller_name: call.caller_name
        }
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="section-header">
        <h2 className="section-title">
          <PhoneIncoming size={20} style={{ marginRight: 8 }} />
          AI Call Logs
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {callLogs.length} calls received
        </span>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {Object.entries(counts).map(([key, count]) => (
          <button
            key={key}
            className={`filter-btn ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {key === 'all' ? 'All' : key} ({count})
          </button>
        ))}
      </div>

      {/* Empty state */}
      {callLogs.length === 0 ? (
        <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
          <Phone size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '1rem' }}>No calls yet</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            When callers dial your Vapi number, their calls will appear here automatically.
          </p>
          <div style={{ marginTop: 20, padding: 16, background: 'var(--surface-2)', borderRadius: 8, fontSize: '0.8rem', textAlign: 'left' }}>
            <strong>Setup Required:</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>Sign up at <a href="https://vapi.ai" target="_blank" rel="noopener" style={{ color: 'var(--accent-blue)' }}>vapi.ai</a> (free tier)</li>
              <li>Create an assistant using <code>vapi-config.json</code></li>
              <li>Deploy the webhook: <code>supabase functions deploy vapi-webhook</code></li>
              <li>Add your webhook URL to Vapi settings</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="call-logs-list" style={{ flex: 1, overflow: 'auto' }}>
          {filtered.map(call => (
            <div
              key={call.id}
              className={`incident-card ${expandedId === call.id ? 'selected' : ''}`}
              onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="incident-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`priority-badge ${call.priority?.toLowerCase()}`}>
                    {call.priority || 'P3'}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {call.incident_type || 'Unknown'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {formatDuration(call.call_duration)}
                  </span>
                  {call.linked_incident_id ? (
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'var(--accent-green)', color: 'white', borderRadius: 4 }}>
                      DISPATCHED
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'var(--accent-orange)', color: 'white', borderRadius: 4 }}>
                      PENDING
                    </span>
                  )}
                  {expandedId === call.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              <div className="incident-card-body" style={{ fontSize: '0.8rem' }}>
                {call.summary || call.transcript?.slice(0, 150) || 'No transcript available'}
                {call.transcript?.length > 150 && '…'}
              </div>

              <div className="incident-meta">
                <Clock size={11} />
                <span>{timeAgo(call.created_at)}</span>
                {call.caller_phone && (
                  <>
                    <Phone size={11} />
                    <span>{call.caller_phone}</span>
                  </>
                )}
                {call.location_raw && (
                  <>
                    <MapPin size={11} />
                    <span>{call.location_raw}</span>
                  </>
                )}
                {call.caller_name && (
                  <>
                    <User size={11} />
                    <span>{call.caller_name}</span>
                  </>
                )}
              </div>

              {/* Expanded details */}
              {expandedId === call.id && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-default)' }}>
                  {call.transcript && (
                    <div style={{ marginBottom: 12 }}>
                      <strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Full Transcript:</strong>
                      <p style={{ margin: '4px 0', fontSize: '0.8rem', whiteSpace: 'pre-wrap', background: 'var(--surface-2)', padding: 8, borderRadius: 4 }}>
                        {call.transcript}
                      </p>
                    </div>
                  )}
                  
                  {call.patient_condition && (
                    <div style={{ marginBottom: 8, fontSize: '0.8rem' }}>
                      <AlertCircle size={12} style={{ marginRight: 4 }} />
                      <strong>Patient:</strong> {call.patient_condition}
                      {call.patient_count > 1 && ` (${call.patient_count} patients)`}
                    </div>
                  )}

                  {!call.linked_incident_id && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateIncident(call);
                      }}
                      style={{ marginTop: 8 }}
                    >
                      Create Incident & Dispatch
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
