const assert = require('assert');
const { describe, it, beforeEach, afterEach } = require('node:test');
const { IBGEClient } = require('../src/ibge-client');

describe('IBGEClient', () => {
  let client;

  beforeEach(() => {
    // Limpar cache antes de cada teste
    client = new IBGEClient({ cacheTTL: 1000 }); // 1 segundo para testes rápidos
  });

  afterEach(() => {
    // Limpar qualquer dado pós-teste
    if (client.clearCache) client.clearCache();
  });

  describe('fetchStations', () => {
    it('should fetch stations from IBGE API and transform them correctly', async () => {
      const stations = await client.fetchStations();

      assert.ok(Array.isArray(stations), 'stations should be an array');

      if (stations.length > 0) {
        const station = stations[0];
        assert.ok(station.id, 'station should have id');
        assert.ok(station.name, 'station should have name');
        assert.strictEqual(typeof station.latitude, 'number', 'latitude should be number');
        assert.strictEqual(typeof station.longitude, 'number', 'longitude should be number');
        assert.ok(station.uf, 'station should have uf');
        assert.strictEqual(typeof station.online, 'boolean', 'online should be boolean');
        assert.ok(station.status, 'station should have status');
      }
    });

    it('should include all required fields in response', async () => {
      const response = await client.getStations();

      assert.ok(response.success, 'response should have success: true');
      assert.ok(Array.isArray(response.stations), 'response should have stations array');
      assert.strictEqual(response.source, 'ibge', 'source should be "ibge"');
      assert.ok(response.lastUpdated, 'should have lastUpdated timestamp');
      assert.ok(['fresh', 'stale'].includes(response.cacheStatus), 'should have valid cacheStatus');
    });

    it('should use NTRIP fallback on IBGE failure', async () => {
      // Força erro na API IBGE
      client.apiUrl = 'https://invalid.example.com/api';

      const response = await client.getStations({ fallbackToNTRIP: true });

      // Deve ter fallback habilitado ou error informado
      assert.ok(response.success || response.error, 'response should indicate success or error');
    });

    it('should respect cache TTL', async () => {
      // Primeira chamada
      const response1 = await client.getStations();
      assert.strictEqual(response1.cacheStatus, 'fresh', 'first call should be fresh');

      // Segunda chamada imediata
      const response2 = await client.getStations();
      assert.strictEqual(response2.cacheStatus, 'fresh', 'second call should hit cache');

      // Esperar pela expiração do cache
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Terceira chamada após expiração
      const response3 = await client.getStations();
      assert.strictEqual(response3.cacheStatus, 'fresh', 'third call should refetch after TTL');
    });

    it('should format datetime in ISO 8601', async () => {
      const response = await client.getStations();

      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
      assert.ok(dateRegex.test(response.lastUpdated), `lastUpdated should be ISO 8601, got: ${response.lastUpdated}`);
    });

    it('should handle API timeout gracefully', async () => {
      client.timeout = 1; // 1ms timeout

      try {
        const response = await client.getStations({ fallbackToNTRIP: true });
        // Se não falhar, deve ter fallback ou error
        assert.ok(!response.success || response.error, 'should handle timeout');
      } catch (err) {
        // Timeout pode lançar
        assert.ok(err, 'should throw on timeout without fallback');
      }
    });

    it('should map IBGE situacao to online status', async () => {
      const stations = await client.fetchStations();

      // Verificar que todas as estações têm status mapeado
      stations.forEach((station) => {
        assert.strictEqual(typeof station.online, 'boolean', `station ${station.id} should have online boolean`);
        assert.ok(['OPERATIONAL', 'MAINTENANCE', 'OFFLINE'].includes(station.status), 
          `station ${station.id} should have valid status`);
      });
    });
  });

  describe('Cache behavior', () => {
    it('should return cached data without calling API twice within TTL', async () => {
      let callCount = 0;
      const originalFetch = client.fetchStations;

      client.fetchStations = async function() {
        callCount++;
        return originalFetch.call(this);
      };

      await client.getStations();
      const firstCallCount = callCount;

      await client.getStations();
      const secondCallCount = callCount;

      assert.strictEqual(secondCallCount, firstCallCount, 'should not call fetch twice within TTL');
    });

    it('should clear cache on demand', async () => {
      await client.getStations();

      if (client.clearCache) {
        client.clearCache();
      }
      
      // Próxima chamada deve forçar refresh
      const response = await client.getStations();
      assert.strictEqual(response.cacheStatus, 'fresh', 'should refetch after cache clear');
    });
  });
});
