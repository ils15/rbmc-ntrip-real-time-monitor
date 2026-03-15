const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('node:test');

describe('IBGE Integration Tests', () => {
  let server;
  let port = 3001;

  beforeEach(() => {
    // Mock the IBGE client for integration testing
    process.env.PORT = port;
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  it('should have exported IBGEClient class', () => {
    const { IBGEClient } = require('../src/ibge-client');
    assert.ok(typeof IBGEClient === 'function', 'IBGEClient should be a class');
  });

  it('IBGEClient should have required methods', () => {
    const { IBGEClient } = require('../src/ibge-client');
    const client = new IBGEClient();

    assert.ok(typeof client.getStations === 'function', 'should have getStations method');
    assert.ok(typeof client.fetchStations === 'function', 'should have fetchStations method');
    assert.ok(typeof client.clearCache === 'function', 'should have clearCache method');
    assert.ok(typeof client.getCached === 'function', 'should have getCached method');
  });

  it('should initialize with correct defaults', () => {
    const { IBGEClient } = require('../src/ibge-client');
    const client = new IBGEClient();

    assert.strictEqual(client.timeout, 5000, 'default timeout should be 5000ms');
    assert.strictEqual(client.cacheTTL, 60 * 60 * 1000, 'default cache TTL should be 1 hour');
  });

  it('should support custom options', () => {
    const { IBGEClient } = require('../src/ibge-client');
    const client = new IBGEClient({
      timeout: 10000,
      cacheTTL: 30000
    });

    assert.strictEqual(client.timeout, 10000, 'should use custom timeout');
    assert.strictEqual(client.cacheTTL, 30000, 'should use custom cache TTL');
  });

  it('should return mock data on error', async () => {
    const { IBGEClient } = require('../src/ibge-client');
    const client = new IBGEClient();

    const stations = await client.fetchStations();
    assert.ok(Array.isArray(stations), 'should return array');
    assert.ok(stations.length > 0, 'should have at least one station');
    assert.ok(stations[0].id, 'stations should have id');
    assert.ok(stations[0].name, 'stations should have name');
  });

  it('response should have required fields', async () => {
    const { IBGEClient } = require('../src/ibge-client');
    const client = new IBGEClient();

    const response = await client.getStations();
    assert.ok(typeof response.success === 'boolean', 'should have success field');
    assert.ok(Array.isArray(response.stations), 'should have stations array');
    assert.ok(response.source, 'should have source field');
    assert.ok(response.lastUpdated, 'should have lastUpdated field');
    assert.ok(response.cacheStatus, 'should have cacheStatus field');
  });

  it('stations should have coordinate system and equipment', async () => {
    const { IBGEClient } = require('../src/ibge-client');
    const client = new IBGEClient();

    const response = await client.getStations();
    const station = response.stations[0];
    
    assert.strictEqual(station.coordinate_system, 'SIRGAS2000/WGS84', 'should have SIRGAS2000/WGS84');
    assert.strictEqual(station.equipment, 'GNSS', 'should have GNSS equipment');
  });
});
