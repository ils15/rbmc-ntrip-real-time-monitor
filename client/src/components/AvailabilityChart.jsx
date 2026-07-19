import React, { useState, useEffect } from 'react';
import { useLanguage, useTranslation } from '../i18n.jsx';

function AvailabilityChart({ stationCode, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { language } = useLanguage();

  useEffect(() => {
    if (!stationCode) return;
    setLoading(true);
    fetch(`/api/availability/${stationCode}?days=30`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [stationCode]);

  if (loading) return <div className="availability-chart-loading">Loading...</div>;
  if (!data) return <div className="availability-chart-error">No data available</div>;

  const { uptime, history } = data;

  // Build a simple 30-day bar chart using divs
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const dayEntries = history.filter(h => h.timestamp.slice(0, 10) === dateStr);
    const wasOnline = dayEntries.some(e => e.status === 'online');
    days.push({ date: dateStr, online: wasOnline, entries: dayEntries.length });
  }

  return (
    <div className="availability-chart" role="region" aria-label={`Availability for ${stationCode}`}>
      <div className="chart-header">
        <h3>{stationCode} — 30 Day Availability</h3>
        <button onClick={onClose} className="chart-close" aria-label="Close chart">&times;</button>
      </div>

      <div className="chart-stats">
        <div className="chart-stat">
          <span className="stat-value">{uptime?.uptime != null ? `${uptime.uptime}%` : 'N/A'}</span>
          <span className="stat-label">Uptime</span>
        </div>
        <div className="chart-stat">
          <span className="stat-value">{uptime?.dataPoints ?? 0}</span>
          <span className="stat-label">Status Changes</span>
        </div>
        <div className="chart-stat">
          <span className="stat-value">{uptime?.period}</span>
          <span className="stat-label">Period</span>
        </div>
      </div>

      <div className="chart-bars">
        {days.map((day) => (
          <div
            key={day.date}
            className={`chart-bar ${day.online ? 'online' : day.entries > 0 ? 'offline' : 'no-data'}`}
            title={`${day.date}: ${day.online ? 'Online' : day.entries > 0 ? 'Offline' : 'No data'}`}
          />
        ))}
      </div>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-dot online" /> Online</span>
        <span className="legend-item"><span className="legend-dot offline" /> Offline</span>
        <span className="legend-item"><span className="legend-dot no-data" /> No data</span>
      </div>
    </div>
  );
}

export default AvailabilityChart;
