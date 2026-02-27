import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, Clock, CheckCircle, Truck, AlertTriangle,
  Activity, TrendingUp, MapPin
} from 'lucide-react';

const TYPE_COLORS = {
  cardiac: 'red',
  trauma: 'orange',
  accident: 'blue',
  burns: 'purple',
  respiratory: 'cyan',
  other: 'green',
};

// Mini SVG line chart component
function MiniLineChart({ data, color = 'var(--accent-blue)', height = 120 }) {
  if (!data.length) return null;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const padding = { top: 10, bottom: 24, left: 6, right: 6 };
  const chartW = 100; // viewBox width %
  const chartH = height;
  const usableW = chartW - padding.left - padding.right;
  const usableH = chartH - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * usableW;
    const y = padding.top + usableH - (d.value / maxVal) * usableH;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaD = pathD + ` L${points[points.length - 1].x},${chartH - padding.bottom} L${points[0].x},${chartH - padding.bottom} Z`;

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="svg-line-chart">
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#lineGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="2" fill={color} />
          <text x={p.x} y={chartH - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="5" fontFamily="var(--font-sans)">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function AnalyticsPanel({ incidents, ambulances, hospitals }) {
  const analytics = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Time-based filters
    const today = incidents.filter(i => now - new Date(i.created_at).getTime() < oneDayMs);
    const resolved = incidents.filter(i => i.status === 'resolved');
    const open = incidents.filter(i => i.status !== 'resolved');

    // Avg response time (minutes between created_at and dispatched_at)
    const responseTimes = incidents
      .filter(i => i.dispatched_at && i.created_at)
      .map(i => (new Date(i.dispatched_at).getTime() - new Date(i.created_at).getTime()) / 60000);
    const avgResponseTime = responseTimes.length
      ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
      : '—';

    // Resolution rate
    const resolutionRate = incidents.length
      ? Math.round((resolved.length / incidents.length) * 100)
      : 0;

    // Fleet utilization
    const dispatched = ambulances.filter(a => a.status === 'dispatched' || a.status === 'returning').length;
    const fleetUtil = ambulances.length
      ? Math.round((dispatched / ambulances.length) * 100)
      : 0;

    // Incidents by type
    const byType = {};
    incidents.forEach(i => {
      const t = (i.incident_type || 'other').toLowerCase();
      byType[t] = (byType[t] || 0) + 1;
    });

    // Incidents by zone
    const byZone = {};
    incidents.forEach(i => {
      const zone = i.location_raw?.split(',')[0]?.trim() || 'Unknown';
      if (!byZone[zone]) byZone[zone] = { count: 0, p1: 0 };
      byZone[zone].count++;
      if (i.priority === 'P1') byZone[zone].p1++;
    });

    // Last 7 days trend
    const dayTrend = [];
    for (let d = 6; d >= 0; d--) {
      const dayStart = new Date(now - d * oneDayMs);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + oneDayMs);
      const count = incidents.filter(i => {
        const t = new Date(i.created_at).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      }).length;
      const dayName = dayStart.toLocaleDateString('en-IN', { weekday: 'short' });
      dayTrend.push({ label: dayName, value: count });
    }

    // Priority breakdown
    const p1Count = incidents.filter(i => i.priority === 'P1').length;
    const p2Count = incidents.filter(i => i.priority === 'P2').length;
    const p3Count = incidents.filter(i => i.priority === 'P3').length;

    return {
      todayCount: today.length,
      totalCount: incidents.length,
      openCount: open.length,
      resolvedCount: resolved.length,
      avgResponseTime,
      resolutionRate,
      fleetUtil,
      byType,
      byZone,
      dayTrend,
      p1Count,
      p2Count,
      p3Count,
    };
  }, [incidents, ambulances]);

  const maxTypeCount = Math.max(...Object.values(analytics.byType), 1);
  const topZones = Object.entries(analytics.byZone)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);
  const maxZoneCount = topZones.length ? Math.max(...topZones.map(z => z[1].count), 1) : 1;

  const fadeIn = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div
      className="analytics-page"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    >
      <div className="analytics-header">
        <h2><BarChart3 size={22} /> Response Analytics</h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Across {analytics.totalCount} total incidents
        </span>
      </div>

      {/* KPI Cards */}
      <div className="analytics-kpis">
        {[
          { icon: Clock, label: 'Avg Response Time', value: analytics.avgResponseTime === '—' ? '—' : `${analytics.avgResponseTime}m`, sub: 'from report to dispatch', color: 'blue' },
          { icon: AlertTriangle, label: 'Active Incidents', value: analytics.openCount, sub: `${analytics.p1Count} Critical · ${analytics.p2Count} Urgent`, color: 'red' },
          { icon: CheckCircle, label: 'Resolution Rate', value: `${analytics.resolutionRate}%`, sub: `${analytics.resolvedCount} of ${analytics.totalCount} resolved`, color: 'green' },
          { icon: Truck, label: 'Fleet Utilization', value: `${analytics.fleetUtil}%`, sub: `${ambulances.length} ambulances tracked`, color: 'orange' },
          { icon: Activity, label: 'Today\'s Incidents', value: analytics.todayCount, sub: 'last 24 hours', color: 'purple' },
          { icon: TrendingUp, label: 'Total Hospitals', value: hospitals.length, sub: 'connected to network', color: 'cyan' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} className="kpi-card" variants={fadeIn}>
            <div className={`kpi-icon ${kpi.color}`}>
              <kpi.icon size={18} />
            </div>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-subtitle">{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="analytics-charts">
        {/* Incidents by Type */}
        <motion.div className="chart-card" variants={fadeIn}>
          <div className="chart-card-title">
            <Activity size={16} /> Incidents by Type
          </div>
          <div className="chart-bar-group">
            {Object.entries(analytics.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div className="chart-bar-row" key={type}>
                  <span className="chart-bar-label">{type}</span>
                  <div className="chart-bar-track">
                    <div
                      className={`chart-bar-fill ${TYPE_COLORS[type] || 'blue'}`}
                      style={{ width: `${(count / maxTypeCount) * 100}%` }}
                    />
                  </div>
                  <span className="chart-bar-count">{count}</span>
                </div>
              ))}
          </div>
        </motion.div>

        {/* Zone Breakdown */}
        <motion.div className="chart-card" variants={fadeIn}>
          <div className="chart-card-title">
            <MapPin size={16} /> Zone Breakdown
          </div>
          <table className="zone-table">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Incidents</th>
                <th>P1</th>
                <th>Load</th>
              </tr>
            </thead>
            <tbody>
              {topZones.map(([zone, data]) => (
                <tr key={zone}>
                  <td>{zone.length > 18 ? zone.slice(0, 18) + '…' : zone}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{data.count}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: data.p1 ? 'var(--p1-color)' : 'var(--text-muted)' }}>
                    {data.p1 || '—'}
                  </td>
                  <td>
                    <div className="zone-bar-mini">
                      <div
                        className="zone-bar-mini-fill"
                        style={{ width: `${(data.count / maxZoneCount) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* 7-Day Trend */}
        <motion.div className="chart-card full-width" variants={fadeIn}>
          <div className="chart-card-title">
            <TrendingUp size={16} /> 7-Day Incident Trend
          </div>
          <MiniLineChart data={analytics.dayTrend} color="var(--accent-blue)" height={140} />
        </motion.div>
      </div>
    </motion.div>
  );
}
