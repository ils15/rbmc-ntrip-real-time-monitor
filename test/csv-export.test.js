const assert = require('assert');
const { describe, it } = require('node:test');
const { stationsToCsv, stationToRow, csvEscape } = require('../src/csv-export');

describe('csv-export', () => {
  describe('stationsToCsv', () => {
    it('should include header row', () => {
      const csv = stationsToCsv([]);
      assert.strictEqual(
        csv,
        'code,mountpoint,name,latitude,longitude,uf,format,online,status'
      );
    });

    it('should map IBGE-shaped stations (id/name/uf) without empty columns', () => {
      const csv = stationsToCsv([
        {
          id: 'SSRA02IGS0_SIRGAS2000',
          name: 'RTCM-SSR APC SIRGAS2000',
          latitude: 50.09,
          longitude: 8.66,
          online: true,
          status: 'OPERATIONAL',
          uf: 'DEU'
        }
      ]);

      const lines = csv.split('\n');
      assert.strictEqual(lines.length, 2);
      const row = lines[1].split(',');
      assert.strictEqual(row[0], 'SSRA'); // normalized 4-char code
      assert.strictEqual(row[1], 'SSRA02IGS0_SIRGAS2000'); // mountpoint falls back to id
      assert.strictEqual(row[2], 'RTCM-SSR APC SIRGAS2000');
      assert.strictEqual(row[3], '50.09');
      assert.strictEqual(row[4], '8.66');
      assert.strictEqual(row[5], 'DEU');
      assert.strictEqual(row[7], 'online');
      assert.strictEqual(row[8], 'OPERATIONAL');
    });

    it('should map NTRIP-shaped stations (mountpoint/identifier/format)', () => {
      const csv = stationsToCsv([
        {
          mountpoint: 'NAUS00BGD0',
          identifier: 'NAUS',
          format: 'RTCM 3.2',
          country: 'BRA',
          latitude: -3.088,
          longitude: -59.923,
          online: false
        }
      ]);

      const row = csv.split('\n')[1].split(',');
      assert.strictEqual(row[0], 'NAUS');
      assert.strictEqual(row[1], 'NAUS00BGD0');
      assert.strictEqual(row[6], 'RTCM 3.2');
      assert.strictEqual(row[7], 'offline');
      assert.strictEqual(row[8], 'OFFLINE'); // derived status
    });

    it('should escape commas, quotes and newlines', () => {
      const csv = stationsToCsv([
        { id: 'RJNI', name: 'Rio, "Nova" \n Ih', online: true }
      ]);
      // The escaped value itself contains a newline inside quotes, so check
      // against the whole document instead of splitting lines.
      assert.ok(
        csv.includes('"Rio, ""Nova"" \n Ih"'),
        'value with comma/quote/newline should be quoted and escaped'
      );
      assert.ok(csv.startsWith('code,mountpoint,name,'));
    });
  });

  describe('stationToRow', () => {
    it('should treat string "online" as online', () => {
      const row = stationToRow({ id: 'SPMT', online: 'online' });
      assert.strictEqual(row[7], 'online');
    });

    it('should treat missing online as offline', () => {
      const row = stationToRow({ id: 'SPMT' });
      assert.strictEqual(row[7], 'offline');
      assert.strictEqual(row[8], 'OFFLINE');
    });
  });

  describe('csvEscape', () => {
    it('should leave plain values untouched', () => {
      assert.strictEqual(csvEscape('NAUS'), 'NAUS');
    });

    it('should double quotes and wrap when needed', () => {
      assert.strictEqual(csvEscape('a"b'), '"a""b"');
      assert.strictEqual(csvEscape('a,b'), '"a,b"');
      assert.strictEqual(csvEscape(undefined), '');
    });
  });
});
