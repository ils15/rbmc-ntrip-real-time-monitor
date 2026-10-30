/**
 * CSV export helpers for station data.
 * Handles both IBGE-shaped ({id, name, uf, ...}) and NTRIP-shaped
 * ({mountpoint, identifier, format, country, ...}) stations.
 */

function normalizeStationCode(stationCode) {
  const normalized = String(stationCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (normalized.length === 5 && normalized.endsWith('0')) {
    return normalized.slice(0, 4);
  }

  return normalized.slice(0, 4);
}

function csvEscape(value) {
  let str = String(value ?? '');
  str = str.replace(/"/g, '""');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str}"`;
  }
  return str;
}

const CSV_HEADERS = [
  'code',
  'mountpoint',
  'name',
  'latitude',
  'longitude',
  'uf',
  'format',
  'online',
  'status'
];

function stationToRow(station) {
  const code = normalizeStationCode(station.mountpoint || station.identifier || station.id || '');
  const online = station.online === true || station.online === 'online';
  return [
    code,
    station.mountpoint || station.id || '',
    station.name || station.identifier || '',
    station.latitude ?? '',
    station.longitude ?? '',
    station.uf || station.country || '',
    station.format || '',
    online ? 'online' : 'offline',
    station.status || (online ? 'OPERATIONAL' : 'OFFLINE')
  ];
}

/**
 * Build a CSV document (without BOM) from a stations array.
 */
function stationsToCsv(stations) {
  const rows = (stations || []).map((station) =>
    stationToRow(station).map(csvEscape).join(',')
  );
  return [CSV_HEADERS.join(','), ...rows].join('\n');
}

module.exports = { stationsToCsv, stationToRow, csvEscape, normalizeStationCode };
