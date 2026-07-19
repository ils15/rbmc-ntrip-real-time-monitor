/**
 * Station Availability Tracker
 * Tracks online/offline status changes over time.
 * Persists to a JSON file for durability across restarts.
 */
const fs = require('fs');
const path = require('path');

class AvailabilityTracker {
  constructor(options = {}) {
    this.data = {}; // { stationCode: [{ status: 'online'|'offline', timestamp: ISO }] }
    this.filePath = options.filePath || path.join(__dirname, '..', 'data', 'availability.json');
    this.retentionDays = options.retentionDays || 90; // keep 90 days
    this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
        console.log(`[Availability] Loaded ${Object.keys(this.data).length} stations from disk`);
      }
    } catch (err) {
      console.warn('[Availability] Could not load data:', err.message);
      this.data = {};
    }
  }

  _save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (err) {
      console.warn('[Availability] Could not save data:', err.message);
    }
  }

  /**
   * Record a status change for a station.
   * Only records if status actually changed (deduplication).
   */
  recordStatus(stationCode, isOnline) {
    const status = isOnline ? 'online' : 'offline';
    const now = new Date().toISOString();

    if (!this.data[stationCode]) {
      this.data[stationCode] = [];
    }

    const history = this.data[stationCode];
    const lastEntry = history[history.length - 1];

    // Don't duplicate same status
    if (lastEntry && lastEntry.status === status) return;

    history.push({ status, timestamp: now });

    // Trim old entries beyond retention
    const cutoff = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    this.data[stationCode] = history.filter(e => new Date(e.timestamp).getTime() > cutoff);

    // Save periodically (every 50 records)
    const totalRecords = Object.values(this.data).reduce((sum, arr) => sum + arr.length, 0);
    if (totalRecords % 50 === 0) {
      this._save();
    }
  }

  /**
   * Batch record statuses from a stations array.
   */
  recordBatch(stations) {
    for (const station of stations) {
      const code = station.mountpoint || station.identifier || station.id;
      if (code) {
        this.recordStatus(code, station.online);
      }
    }
    this._save(); // always save after batch
  }

  /**
   * Get availability history for a station.
   * Returns array of { status, timestamp } sorted newest first.
   */
  getHistory(stationCode, days = 30) {
    const history = this.data[stationCode] || [];
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return history
      .filter(e => new Date(e.timestamp).getTime() > cutoff)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Calculate uptime percentage for a station over a period.
   */
  getUptime(stationCode, days = 30) {
    const history = this.getHistory(stationCode, days);
    if (history.length === 0) return { uptime: null, dataPoints: 0 };

    let onlineMs = 0;
    let totalMs = 0;
    const now = Date.now();
    const cutoff = now - (days * 24 * 60 * 60 * 1000);

    for (let i = 0; i < history.length; i++) {
      const entryTime = new Date(history[i].timestamp).getTime();
      const nextTime = i < history.length - 1 ? new Date(history[i + 1].timestamp).getTime() : now;
      const duration = Math.min(nextTime, now) - Math.max(entryTime, cutoff);

      if (duration > 0) {
        totalMs += duration;
        if (history[i].status === 'online') {
          onlineMs += duration;
        }
      }
    }

    return {
      uptime: totalMs > 0 ? Math.round((onlineMs / totalMs) * 10000) / 100 : null,
      dataPoints: history.length,
      period: `${days} days`
    };
  }

  /**
   * Get summary for all stations.
   */
  getAllUptime(days = 30) {
    const summary = {};
    for (const [code, history] of Object.entries(this.data)) {
      summary[code] = this.getUptime(code, days);
    }
    return summary;
  }
}

module.exports = { AvailabilityTracker };
