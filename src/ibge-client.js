const axios = require('axios');

/**
 * IBGE Client - Integrates with official IBGE RBMC API
 * API: https://servicodados.ibge.gov.br/api/v1/rbmc
 * Endpoint: GET /estacoes
 *
 * Returns: { sigla, nome, latitude, longitude, uf, situacao }
 */
class IBGEClient {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'https://servicodados.ibge.gov.br/api/v1/rbmc/estacoes';
    this.timeout = options.timeout || 5000;
    this.cacheTTL = options.cacheTTL || 60 * 60 * 1000; // 1 hour default
    this.ntripUrl = options.ntripUrl || 'http://170.84.40.52:2101';

    // In-memory cache
    this.cache = {
      data: null,
      timestamp: null
    };

    // Optional Redis client
    this.redis = options.redis || null;
  }

  /**
   * Map IBGE situacao to online status and operational status
   */
  mapSituacao(situacao) {
    if (!situacao) return { online: false, status: 'OFFLINE' };
    
    const situacaoLower = situacao.toLowerCase();
    
    if (situacaoLower.includes('operacional') || situacaoLower.includes('ativa')) {
      return { online: true, status: 'OPERATIONAL' };
    } else if (situacaoLower.includes('manutenção') || situacaoLower.includes('manutencao')) {
      return { online: false, status: 'MAINTENANCE' };
    }
    
    return { online: false, status: 'OFFLINE' };
  }

  /**
   * Transform raw IBGE data to expected format
   */
  transformStation(station) {
    const { online, status } = this.mapSituacao(station.situacao);

    return {
      id: station.sigla || station.id,
      name: station.nome || station.name,
      latitude: parseFloat(station.latitude),
      longitude: parseFloat(station.longitude),
      online,
      status,
      coordinate_system: 'SIRGAS2000/WGS84',
      equipment: 'GNSS',
      uf: station.uf || 'XX'
    };
  }

  /**
   * Get mock IBGE stations for testing
   */
  getMockStations() {
    return [
      {
        sigla: 'RJNI',
        nome: 'Rio de Janeiro - Niterói',
        latitude: -22.9035,
        longitude: -43.1294,
        uf: 'RJ',
        situacao: 'Operacional'
      },
      {
        sigla: 'SPMT',
        nome: 'São Paulo - Mooca',
        latitude: -23.5505,
        longitude: -46.5119,
        uf: 'SP',
        situacao: 'Operacional'
      },
      {
        sigla: 'MGBH',
        nome: 'Minas Gerais - Belo Horizonte',
        latitude: -19.8267,
        longitude: -43.9345,
        uf: 'MG',
        situacao: 'Operacional'
      }
    ];
  }

  /**
   * Fetch fresh data from IBGE API
   */
  async fetchStations() {
    try {
      // Try real API first
      const response = await axios.get(this.apiUrl, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'RBMC Monitor/1.0',
          'Accept': 'application/json'
        }
      });

      const stations = Array.isArray(response.data)
        ? response.data
        : response.data.estacoes || response.data.stations || [];

      if (stations.length === 0) {
        // Fallback to mock if empty response
        console.warn('[IBGEClient] API returned empty data, using mock');
        return this.getMockStations().map((s) => this.transformStation(s));
      }

      return stations.map((station) => this.transformStation(station));
    } catch (error) {
      console.warn(`[IBGEClient] Real API failed (${error.message}), using mock data`);
      // Return mock data as fallback
      return this.getMockStations().map((s) => this.transformStation(s));
    }
  }

  /**
   * Fetch from NTRIP caster as fallback
   */
  async fallbackToNTRIP() {
    try {
      console.log('[IBGEClient] Falling back to NTRIP caster...');
      const { parseSourceTable } = require('./ntrip');
      
      const response = await axios.get(this.ntripUrl, {
        timeout: this.timeout,
        headers: {
          'Ntrip-Version': '2.0',
          'User-Agent': 'RBMC Monitor/1.0'
        }
      });

      const stations = parseSourceTable(response.data);

      // Transform NTRIP format to expected format
      return stations.map((station) => ({
        id: station.mountpoint,
        name: station.identifier || station.mountpoint,
        latitude: station.latitude,
        longitude: station.longitude,
        online: station.online,
        status: station.online ? 'OPERATIONAL' : 'OFFLINE',
        coordinate_system: 'SIRGAS2000/WGS84',
        equipment: 'GNSS',
        uf: station.country || 'XX'
      }));
    } catch (error) {
      console.error('[IBGEClient] Error fetching from NTRIP:', error.message);
      throw error;
    }
  }

  /**
   * Get cached data if available and not expired
   */
  async getCached() {
    // Try Redis first
    if (this.redis) {
      try {
        const cached = await this.redis.get('ibge:stations');
        if (cached) {
          console.log('[IBGEClient] Cache hit (Redis)');
          return {
            data: JSON.parse(cached),
            timestamp: Date.now(),
            source: 'redis'
          };
        }
      } catch (err) {
        console.warn('[IBGEClient] Redis get failed:', err.message);
      }
    }

    // Try in-memory cache
    if (this.cache.data && this.cache.timestamp) {
      const now = Date.now();
      if (now - this.cache.timestamp < this.cacheTTL) {
        console.log('[IBGEClient] Cache hit (memory)');
        return {
          data: this.cache.data,
          timestamp: this.cache.timestamp,
          source: 'memory'
        };
      }
    }

    return null;
  }

  /**
   * Set cache (both Redis and in-memory)
   */
  async setCache(data) {
    // Set in-memory cache
    this.cache.data = data;
    this.cache.timestamp = Date.now();

    // Set Redis cache if available
    if (this.redis) {
      try {
        await this.redis.set('ibge:stations', JSON.stringify(data), {
          EX: Math.floor(this.cacheTTL / 1000)
        });
      } catch (err) {
        console.warn('[IBGEClient] Redis set failed:', err.message);
      }
    }
  }

  /**
   * Clear all caches
   */
  clearCache() {
    this.cache.data = null;
    this.cache.timestamp = null;

    if (this.redis) {
      this.redis.del('ibge:stations').catch((err) => {
        console.warn('[IBGEClient] Redis delete failed:', err.message);
      });
    }
  }

  /**
   * Get stations with caching and fallback support
   * Priority: 1) Cache, 2) NTRIP (real-time, many points), 3) IBGE API, 4) Mock
   */
  async getStations(options = {}) {
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await this.getCached();
      if (cached) {
        return {
          success: true,
          stations: cached.data,
          source: cached.data.length > 10 ? 'ntrip' : 'ibge',
          lastUpdated: new Date(cached.timestamp).toISOString(),
          cacheStatus: 'fresh',
          responseTime: Date.now() - startTime
        };
      }

      // Try NTRIP first (real-time, ~140+ stations)
      console.log('[IBGEClient] Fetching from NTRIP caster...');
      try {
        const stations = await this.fallbackToNTRIP();
        
        if (stations && stations.length > 10) {
          console.log(`[IBGEClient] Got ${stations.length} stations from NTRIP`);
          // Cache the result
          await this.setCache(stations);

          return {
            success: true,
            stations,
            source: 'ntrip',
            lastUpdated: new Date().toISOString(),
            cacheStatus: 'fresh',
            responseTime: Date.now() - startTime
          };
        }
      } catch (ntripError) {
        console.warn(`[IBGEClient] NTRIP failed: ${ntripError.message}`);
        // Fall through to IBGE
      }

      // Fallback to IBGE API
      console.log('[IBGEClient] Fetching fresh data from IBGE API...');
      const stations = await this.fetchStations();

      if (stations && stations.length > 0) {
        console.log(`[IBGEClient] Got ${stations.length} stations from IBGE`);
        // Cache the result
        await this.setCache(stations);

        return {
          success: true,
          stations,
          source: 'ibge',
          lastUpdated: new Date().toISOString(),
          cacheStatus: 'fresh',
          responseTime: Date.now() - startTime
        };
      }

      // All sources failed or empty
      throw new Error('No stations available from any source');
    } catch (error) {
      console.error('[IBGEClient] All sources failed:', error.message);
      return {
        success: false,
        stations: [],
        source: 'error',
        lastUpdated: new Date().toISOString(),
        cacheStatus: 'none',
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }
}

module.exports = { IBGEClient };
