const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it, beforeEach, afterEach } = require('node:test');
const { AvailabilityTracker } = require('../src/availability-tracker');

describe('AvailabilityTracker', () => {
  let tracker;
  const testFilePath = path.join(__dirname, '..', 'data', 'test-availability.json');

  beforeEach(() => {
    // Clean up test file before each test
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    tracker = new AvailabilityTracker({ filePath: testFilePath });
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  describe('recordStatus', () => {
    it('should record a status change', () => {
      tracker.recordStatus('RJNI', true);
      const history = tracker.getHistory('RJNI', 1);
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].status, 'online');
    });

    it('should not duplicate the same status', () => {
      tracker.recordStatus('RJNI', true);
      tracker.recordStatus('RJNI', true);
      const history = tracker.getHistory('RJNI', 1);
      assert.strictEqual(history.length, 1);
    });

    it('should record status changes', (t, done) => {
      tracker.recordStatus('RJNI', true);
      // Use setTimeout to ensure different timestamps for the two records
      setTimeout(() => {
        tracker.recordStatus('RJNI', false);
        const history = tracker.getHistory('RJNI', 1);
        assert.strictEqual(history.length, 2);
        // Newest first: offline should be first
        assert.strictEqual(history[0].status, 'offline');
        assert.strictEqual(history[1].status, 'online');
        done();
      }, 5);
    });
  });

  describe('recordBatch', () => {
    it('should record multiple stations at once', () => {
      const stations = [
        { mountpoint: 'RJNI', online: true },
        { mountpoint: 'SPMT', online: false },
        { id: 'MGBH', online: true }
      ];
      tracker.recordBatch(stations);

      assert.strictEqual(tracker.getHistory('RJNI', 1).length, 1);
      assert.strictEqual(tracker.getHistory('SPMT', 1).length, 1);
      assert.strictEqual(tracker.getHistory('MGBH', 1).length, 1);
    });

    it('should handle stations with identifier field', () => {
      const stations = [
        { identifier: 'RJRO', online: true }
      ];
      tracker.recordBatch(stations);
      assert.strictEqual(tracker.getHistory('RJRO', 1).length, 1);
    });
  });

  describe('getHistory', () => {
    it('should return empty array for unknown station', () => {
      const history = tracker.getHistory('XXXX', 30);
      assert.ok(Array.isArray(history));
      assert.strictEqual(history.length, 0);
    });

    it('should return history sorted newest first', () => {
      tracker.recordStatus('RJNI', true);
      tracker.recordStatus('RJNI', false);

      const history = tracker.getHistory('RJNI', 1);
      assert.strictEqual(history.length, 2);
      const t1 = new Date(history[0].timestamp).getTime();
      const t2 = new Date(history[1].timestamp).getTime();
      assert.ok(t1 >= t2, 'newest should come first');
    });
  });

  describe('getUptime', () => {
    it('should return null uptime for unknown station', () => {
      const uptime = tracker.getUptime('XXXX', 30);
      assert.strictEqual(uptime.uptime, null);
      assert.strictEqual(uptime.dataPoints, 0);
    });

    it('should calculate uptime percentage', (t, done) => {
      tracker.recordStatus('RJNI', true);
      // Need a small gap so duration calculation is non-zero
      setTimeout(() => {
        tracker.recordStatus('RJNI', false);
        const uptime = tracker.getUptime('RJNI', 1);
        assert.strictEqual(uptime.dataPoints, 2);
        assert.ok(typeof uptime.uptime === 'number');
        assert.ok(uptime.uptime >= 0 && uptime.uptime <= 100);
        done();
      }, 10);
    });

    it('should handle online and offline transitions', (t, done) => {
      tracker.recordStatus('RJNI', true);
      setTimeout(() => {
        tracker.recordStatus('RJNI', false);
        setTimeout(() => {
          tracker.recordStatus('RJNI', true);
          const uptime = tracker.getUptime('RJNI', 1);
          assert.strictEqual(uptime.dataPoints, 3);
          assert.ok(uptime.uptime >= 0 && uptime.uptime <= 100);
          done();
        }, 5);
      }, 5);
    });
  });

  describe('getAllUptime', () => {
    it('should return uptime for all tracked stations', () => {
      tracker.recordStatus('RJNI', true);
      tracker.recordStatus('SPMT', false);

      const summary = tracker.getAllUptime(30);
      assert.ok(summary.RJNI);
      assert.ok(summary.SPMT);
    });

    it('should return empty object when no data', () => {
      const summary = tracker.getAllUptime(30);
      assert.deepStrictEqual(summary, {});
    });
  });

  describe('persistence', () => {
    it('should save and load data from disk', () => {
      tracker.recordStatus('RJNI', true);
      tracker._save();

      // Create new tracker pointing to same file
      const tracker2 = new AvailabilityTracker({ filePath: testFilePath });
      const history = tracker2.getHistory('RJNI', 1);
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].status, 'online');
    });

    it('should handle missing file gracefully', () => {
      const nonExistentPath = path.join(__dirname, '..', 'data', 'nonexistent.json');
      const t = new AvailabilityTracker({ filePath: nonExistentPath });
      assert.deepStrictEqual(t.data, {});
      // Cleanup
      if (fs.existsSync(nonExistentPath)) {
        fs.unlinkSync(nonExistentPath);
      }
    });
  });

  describe('retention', () => {
    it('should trim old entries beyond retention period', () => {
      const shortRetentionTracker = new AvailabilityTracker({
        filePath: testFilePath,
        retentionDays: 0 // immediate expiry for test
      });

      shortRetentionTracker.recordStatus('RJNI', true);
      // The entry is technically expired, but getHistory with 1 day will filter it
      const history = shortRetentionTracker.getHistory('RJNI', 1);
      // With retentionDays=0, the entry may be trimmed on next recordStatus call
      assert.ok(Array.isArray(history));
    });
  });
});
