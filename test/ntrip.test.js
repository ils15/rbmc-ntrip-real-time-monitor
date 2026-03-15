const assert = require('assert');
const { describe, it } = require('node:test');
const { parseSourceTable } = require('../src/ntrip');

describe('parseSourceTable', () => {
  it('parses STR lines and returns station objects', () => {
    const input = `STR;MOUNT;ID;RTCM3;Test;GPS;GPS;NET;BR;10.0;-20.0;Extra\n`;
    const stations = parseSourceTable(input);

    assert.strictEqual(stations.length, 1);
    const station = stations[0];
    assert.strictEqual(station.mountpoint, 'MOUNT');
    assert.strictEqual(station.identifier, 'ID');
    assert.strictEqual(station.format, 'RTCM3');
    assert.strictEqual(station.country, 'BR');
    assert.strictEqual(station.latitude, 10);
    assert.strictEqual(station.longitude, -20);
    assert.strictEqual(station.online, true);
    assert.ok(Array.isArray(station.mountpoints));
    assert.strictEqual(station.mountpoints[0].id, 'MOUNT');
  });

  it('ignores non-STR lines and malformed lines', () => {
    const input = `SOU;foo\nSTR;only;two\nSTR;ok;id;RTCM;D;C;N;N;BR;0;0\n`;
    const stations = parseSourceTable(input);
    assert.strictEqual(stations.length, 1);
    assert.strictEqual(stations[0].mountpoint, 'ok');
  });
});
