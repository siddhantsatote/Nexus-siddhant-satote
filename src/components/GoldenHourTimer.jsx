import { useState, useEffect } from 'react';

// Golden hour = 60 min for P1, 90 min for P2
const GOLDEN_LIMITS = { P1: 60, P2: 90 };

export default function GoldenHourTimer({ createdAt, priority }) {
  const limitMin = GOLDEN_LIMITS[priority];
  if (!limitMin || !createdAt) return null;

  const [remaining, setRemaining] = useState(() => calcRemaining(createdAt, limitMin));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(calcRemaining(createdAt, limitMin));
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt, limitMin]);

  const { minutes, seconds, pct, expired } = remaining;

  // Color phases based on % remaining
  let phase = 'green';
  if (pct <= 10) phase = 'critical';
  else if (pct <= 25) phase = 'red';
  else if (pct <= 50) phase = 'yellow';

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <div className={`golden-hour-timer ${phase} ${expired ? 'expired' : ''}`} title={`Golden Hour: ${minutes}m ${seconds}s remaining`}>
      <svg viewBox="0 0 44 44" className="golden-hour-svg">
        {/* Background track */}
        <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="3" opacity="0.15" />
        {/* Progress arc */}
        <circle
          cx="22" cy="22" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 22 22)"
          className="golden-hour-arc"
        />
      </svg>
      <div className="golden-hour-label">
        {expired ? (
          <span className="golden-expired-text">EXPIRED</span>
        ) : (
          <>
            <span className="golden-min">{minutes}</span>
            <span className="golden-sep">:</span>
            <span className="golden-sec">{String(seconds).padStart(2, '0')}</span>
          </>
        )}
      </div>
    </div>
  );
}

function calcRemaining(createdAt, limitMin) {
  const created = new Date(createdAt).getTime();
  const limitMs = limitMin * 60 * 1000;
  const elapsed = Date.now() - created;
  const left = Math.max(0, limitMs - elapsed);
  const pct = Math.max(0, Math.min(100, (left / limitMs) * 100));
  const totalSeconds = Math.floor(left / 1000);

  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    pct,
    expired: left <= 0,
  };
}
