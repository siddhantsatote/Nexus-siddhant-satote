import { AlertTriangle, BellRing, X } from 'lucide-react';

export default function HospitalPanel({ hospitals, notifications = [], dismissNotification }) {
  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🏥 Hospital Network</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {hospitals.length} facilities connected
        </span>
      </div>

      <div className="fleet-grid">
        {hospitals.map(hosp => {
          const hospNotifs = notifications.filter(n => n.hospitalId === hosp.id);
          const icuMax = (hosp.icu_beds_available || 0) + 5;
          const genMax = (hosp.general_beds_available || 0) + 20;
          const icuPct = Math.min(100, ((hosp.icu_beds_available || 0) / icuMax) * 100);
          const genPct = Math.min(100, ((hosp.general_beds_available || 0) / genMax) * 100);

          return (
            <div className="hospital-card" key={hosp.id}>
              <div className="hospital-card-header">
                <span className="hospital-name">{hosp.name}</span>
                {hospNotifs.length > 0 && (
                  <span className="prenotif-count-badge">
                    {hospNotifs.length} incoming
                  </span>
                )}
              </div>

              {/* Pre-Notification Alerts */}
              {hospNotifs.map(notif => (
                <div className="prenotif-banner" key={notif.id}>
                  <div className="prenotif-header">
                    <div className="prenotif-title">
                      <BellRing size={14} /> Incoming Patient
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="prenotif-eta">ETA: {notif.eta}m</span>
                      {dismissNotification && (
                        <button
                          className="prenotif-dismiss"
                          onClick={() => dismissNotification(notif.id)}
                          title="Dismiss notification"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="prenotif-details">
                    <div>
                      <div className="prenotif-detail-label">Condition</div>
                      <div style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                        {notif.incidentType} · <span className={`priority-badge ${notif.priority?.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '1px 6px' }}>{notif.priority}</span>
                      </div>
                    </div>
                    <div>
                      <div className="prenotif-detail-label">Ambulance</div>
                      <div style={{ fontWeight: 600 }}>
                        {notif.ambulanceCode} ({notif.ambulanceType}) — {notif.driverName}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                    {notif.patientInfo}
                  </div>

                  <div className="prenotif-resources">
                    {notif.resources.map(r => (
                      <span key={r} className="prenotif-resource-tag">{r}</span>
                    ))}
                  </div>
                </div>
              ))}

              <div className="bed-bars">
                <div>
                  <div className="bed-bar-label">
                    <span>ICU Beds</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: icuPct < 30 ? 'var(--p1-color)' : 'var(--text-primary)' }}>
                      {hosp.icu_beds_available}
                    </span>
                  </div>
                  <div className="bed-bar-track">
                    <div className="bed-bar-fill icu" style={{ width: `${icuPct}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="bed-bar-label">
                    <span>General Beds</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {hosp.general_beds_available}
                    </span>
                  </div>
                  <div className="bed-bar-track">
                    <div className="bed-bar-fill general" style={{ width: `${genPct}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="capability-badges">
                <span className={`capability-badge ${hosp.trauma_capable ? 'active' : 'inactive'}`}>
                  Trauma
                </span>
                <span className={`capability-badge ${hosp.cardiac_cath ? 'active' : 'inactive'}`}>
                  Cath Lab
                </span>
                <span className={`capability-badge ${hosp.burn_unit ? 'active' : 'inactive'}`}>
                  Burns
                </span>
              </div>

              {hosp.specialties && hosp.specialties.length > 0 && (
                <div className="hospital-specialties">
                  {hosp.specialties.map(spec => (
                    <span key={spec} className="specialty-tag">{spec}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
