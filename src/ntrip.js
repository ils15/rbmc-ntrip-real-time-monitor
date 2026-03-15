/**
 * Parse an NTRIP Source Table (STR lines) into a simplified station list.
 *
 * This parser is tolerant of incomplete lines and returns an array of station objects.
 * Each station includes a minimal `online` boolean and a `mountpoints` array.
 *
 * @param {string} data Raw response body from NTRIP caster
 * @returns {Array<object>}
 */
function parseSourceTable(data) {
  const lines = data.split('\n');
  const stations = [];

  lines.forEach((line) => {
    if (!line.startsWith('STR;')) return;
    const parts = line.split(';');

    // NTRIP Source Table expects: STR;Mountpoint;Identifier;Format;Details;Carrier;NavSystem;Network;Country;Latitude;Longitude;...
    if (parts.length < 11) return;

    const mountpoint = parts[1];
    const identifier = parts[2];

    stations.push({
      mountpoint,
      identifier,
      format: parts[3],
      details: parts[4],
      carrier: parts[5],
      navSystem: parts[6],
      network: parts[7],
      country: parts[8],
      latitude: parseFloat(parts[9]),
      longitude: parseFloat(parts[10]),
      // `online` is inferred from being present in the caster's Source Table.
      // It does not guarantee real-time RTCM reception.
      online: true,
      mountpoints: [
        {
          id: mountpoint,
          name: mountpoint,
          format: parts[3],
          details: parts[4],
          navSystem: parts[6],
          network: parts[7],
          country: parts[8]
        }
      ],
      source: line
    });
  });

  return stations;
}

module.exports = {
  parseSourceTable
};
