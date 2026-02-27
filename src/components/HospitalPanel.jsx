export default function HospitalPanel({ hospitals }) {
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
          const icuMax = (hosp.icu_beds_available || 0) + 5; // estimate
          const genMax = (hosp.general_beds_available || 0) + 20;
          const icuPct = Math.min(100, ((hosp.icu_beds_available || 0) / icuMax) * 100);
          const genPct = Math.min(100, ((hosp.general_beds_available || 0) / genMax) * 100);

          return (
            <div className="hospital-card" key={hosp.id}>
              <div className="hospital-card-header">
                <span className="hospital-name">{hosp.name}</span>
              </div>

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
