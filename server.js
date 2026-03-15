require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de CORS via variáveis de ambiente
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (como mobile apps ou curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

const { parseSourceTable } = require('./src/ntrip');
const { IBGEClient } = require('./src/ibge-client');

const NTRIP_CASTER_URL = process.env.NTRIP_CASTER_URL || 'http://170.84.40.52:2101';

// Cache em memória para evitar sobrecarga no Caster NTRIP (fallback quando não há Redis)
let stationCache = {
  data: null,
  lastFetched: null,
  isStale: false
};
const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS, 10) || 5 * 60 * 1000; // TTL em milissegundos

// Redis cache (opcional, habilitado se REDIS_URL estiver definido)
let redisClient;
const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL) {
  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => console.error('Redis error', err));
    redisClient.connect().catch((err) => console.error('Redis connect failure', err));
  } catch (err) {
    console.warn('Redis client could not be initialized; falling back to in-memory cache.\n', err.message);
  }
}

// Initialize IBGE client with Redis if available
const ibgeClient = new IBGEClient({
  redis: redisClient || null,
  cacheTTL: parseInt(process.env.IBGE_CACHE_TTL || 3600000) // 1 hour default
});


async function getCachedStations() {
  if (redisClient) {
    try {
      const cached = await redisClient.get('rbmc:stations');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn('Redis get failed, falling back to in-memory cache', err.message);
    }
  }

  const now = Date.now();
  if (stationCache.data && stationCache.lastFetched && now - stationCache.lastFetched < CACHE_TTL) {
    return stationCache.data;
  }

  return null;
}

async function setCachedStations(data) {
  if (redisClient) {
    try {
      await redisClient.set('rbmc:stations', JSON.stringify(data), {
        EX: Math.floor(CACHE_TTL / 1000)
      });
    } catch (err) {
      console.warn('Redis set failed, falling back to in-memory cache', err.message);
    }
  }

  stationCache.data = data;
  stationCache.lastFetched = Date.now();
  stationCache.isStale = false;
}

app.get('/api/stations', async (req, res) => {
  // Retornar do cache se ainda for válido
  const cached = await getCachedStations();
  if (cached) {
    return res.json({
      stations: cached,
      lastUpdated: stationCache.lastFetched || Date.now(),
      source: 'cache',
      isStale: stationCache.isStale
    });
  }

  try {
    console.log('Fetching fresh data from NTRIP Caster...');
    const response = await axios.get(NTRIP_CASTER_URL, {
      headers: {
        'Ntrip-Version': '2.0',
        'User-Agent': 'NTRIP RBMC Monitor/1.0'
      },
      timeout: 8000
    });

    const stations = parseSourceTable(response.data);

    await setCachedStations(stations);

    res.json({
      stations,
      lastUpdated: stationCache.lastFetched,
      source: 'live',
      isStale: false
    });
  } catch (error) {
    console.error('Error fetching NTRIP data:', error.message);
    stationCache.isStale = true;

    // Se falhar mas tivermos cache (mesmo expirado), retornar o cache como fallback
    if (stationCache.data) {
      console.log('Error fetching fresh data, serving stale cache as fallback');
      return res.json({
        stations: stationCache.data.map((s) => ({ ...s, online: false })),
        lastUpdated: stationCache.lastFetched,
        source: 'cache',
        isStale: true,
        error: error.message
      });
    }

    res.status(500).json({ error: 'Failed to fetch RBMC data', message: error.message });
  }
});

app.get('/api/stations-ibge', async (req, res) => {
  try {
    const response = await ibgeClient.getStations({
      fallbackToNTRIP: true // Enable fallback for better resilience
    });

    res.json(response);
  } catch (error) {
    console.error('[Server] Error in /api/stations-ibge:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      stations: [],
      source: 'error'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    cached: Boolean(stationCache.data),
    updatedAt: stationCache.lastFetched || null
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
