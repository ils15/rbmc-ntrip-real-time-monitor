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
const RBMC_API_BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/rbmc';

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

function isValidYear(year) {
  return Number.isInteger(year) && year >= 1990 && year <= 2100;
}

function isValidDay(day) {
  return Number.isInteger(day) && day >= 1 && day <= 366;
}

function parseIntParam(value) {
  return Number.parseInt(String(value), 10);
}

async function proxyBinaryFromRBMC({ url, res, fallbackFileName, contentType }) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000
  });

  res.setHeader('Content-Type', response.headers['content-type'] || contentType || 'application/octet-stream');

  const upstreamDisposition = response.headers['content-disposition'];
  if (upstreamDisposition) {
    res.setHeader('Content-Disposition', upstreamDisposition);
  } else if (fallbackFileName) {
    res.setHeader('Content-Disposition', `attachment; filename="${fallbackFileName}"`);
  }

  res.status(200).send(response.data);
}

function sendRBMCProxyError(res, error, defaultMessage) {
  const upstreamStatus = error?.response?.status;
  const upstreamMessage = error?.response?.data?.message || error?.response?.data?.error;

  if (upstreamStatus && upstreamStatus >= 400 && upstreamStatus < 500) {
    return res.status(upstreamStatus).json({
      error: upstreamMessage || defaultMessage,
      message: 'RBMC source returned no file for provided parameters.'
    });
  }

  return res.status(502).json({
    error: defaultMessage,
    message: error.message
  });
}

async function checkRBMCAvailability(url) {
  try {
    const headResponse = await axios.head(url, {
      timeout: 12000,
      validateStatus: () => true
    });

    if (headResponse.status === 200) return true;
    if (headResponse.status === 404 || headResponse.status === 400) return false;
    if (headResponse.status !== 405) return headResponse.status >= 200 && headResponse.status < 300;
  } catch (error) {
    if (error?.response?.status === 404 || error?.response?.status === 400) return false;
  }

  // Some endpoints may not support HEAD; probe with lightweight range GET.
  try {
    const getResponse = await axios.get(url, {
      timeout: 15000,
      headers: { Range: 'bytes=0-0' },
      responseType: 'arraybuffer',
      validateStatus: () => true
    });
    return getResponse.status >= 200 && getResponse.status < 300;
  } catch (error) {
    return false;
  }
}

function buildStationCodeCandidates(rawCandidates) {
  const unique = new Set();
  for (const raw of rawCandidates) {
    const normalized = normalizeStationCode(raw);
    if (normalized.length === 4) unique.add(normalized);
  }
  return Array.from(unique);
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

app.get('/api/rbmc/relatorio/:estacao', async (req, res) => {
  try {
    const station = normalizeStationCode(req.params.estacao);
    if (station.length !== 4) {
      return res.status(400).json({ error: 'Invalid station code. Expected 4 characters.' });
    }

    const url = `${RBMC_API_BASE_URL}/relatorio/${station.toLowerCase()}`;
    await proxyBinaryFromRBMC({
      url,
      res,
      fallbackFileName: `${station}-relatorio.pdf`,
      contentType: 'application/pdf'
    });
  } catch (error) {
    sendRBMCProxyError(res, error, 'Failed to fetch RBMC report.');
  }
});

app.get('/api/rbmc/rinex2/:estacao/:ano/:dia', async (req, res) => {
  try {
    const station = normalizeStationCode(req.params.estacao);
    const ano = parseIntParam(req.params.ano);
    const dia = parseIntParam(req.params.dia);

    if (station.length !== 4 || !isValidYear(ano) || !isValidDay(dia)) {
      return res.status(400).json({ error: 'Invalid parameters for RINEX2 download.' });
    }

    const url = `${RBMC_API_BASE_URL}/dados/rinex2/${station.toLowerCase()}/${ano}/${dia}`;
    await proxyBinaryFromRBMC({
      url,
      res,
      fallbackFileName: `${station}-rinex2-${ano}-${dia}.zip`,
      contentType: 'application/zip'
    });
  } catch (error) {
    sendRBMCProxyError(res, error, 'Failed to fetch RINEX2.');
  }
});

app.get('/api/rbmc/rinex3/:estacao/:ano/:dia', async (req, res) => {
  try {
    const station = normalizeStationCode(req.params.estacao);
    const ano = parseIntParam(req.params.ano);
    const dia = parseIntParam(req.params.dia);

    if (station.length !== 4 || !isValidYear(ano) || !isValidDay(dia)) {
      return res.status(400).json({ error: 'Invalid parameters for RINEX3 download.' });
    }

    const url = `${RBMC_API_BASE_URL}/dados/rinex3/${station.toLowerCase()}/${ano}/${dia}`;
    await proxyBinaryFromRBMC({
      url,
      res,
      fallbackFileName: `${station}-rinex3-${ano}-${dia}.gz`,
      contentType: 'application/gzip'
    });
  } catch (error) {
    sendRBMCProxyError(res, error, 'Failed to fetch RINEX3.');
  }
});

app.get('/api/rbmc/rinex3-1s/:estacao/:ano/:dia/:hora/:minuto/:tipo', async (req, res) => {
  try {
    const station = normalizeStationCode(req.params.estacao);
    const ano = parseIntParam(req.params.ano);
    const dia = parseIntParam(req.params.dia);
    const hora = parseIntParam(req.params.hora);
    const minuto = parseIntParam(req.params.minuto);
    const tipo = String(req.params.tipo || '').toUpperCase();

    const validMinute = [0, 15, 30, 45].includes(minuto);
    const validHour = Number.isInteger(hora) && hora >= 0 && hora <= 23;
    const validType = tipo === 'MO' || tipo === 'MN';

    if (station.length !== 4 || !isValidYear(ano) || !isValidDay(dia) || !validHour || !validMinute || !validType) {
      return res.status(400).json({ error: 'Invalid parameters for RINEX3 1s download.' });
    }

    const url = `${RBMC_API_BASE_URL}/dados/rinex3/1s/${station.toLowerCase()}/${ano}/${dia}/${hora}/${minuto}/${tipo.toLowerCase()}`;
    await proxyBinaryFromRBMC({
      url,
      res,
      fallbackFileName: `${station}-rinex3-1s-${ano}-${dia}-${hora}-${minuto}-${tipo}.gz`,
      contentType: 'application/gzip'
    });
  } catch (error) {
    sendRBMCProxyError(res, error, 'Failed to fetch RINEX3 1s.');
  }
});

app.get('/api/rbmc/orbitas/:ano/:dia', async (req, res) => {
  try {
    const ano = parseIntParam(req.params.ano);
    const dia = parseIntParam(req.params.dia);

    if (!isValidYear(ano) || !isValidDay(dia)) {
      return res.status(400).json({ error: 'Invalid parameters for multiconstellation orbits download.' });
    }

    const url = `${RBMC_API_BASE_URL}/dados/rinex3/orbitas/${ano}/${dia}`;
    await proxyBinaryFromRBMC({
      url,
      res,
      fallbackFileName: `orbitas-${ano}-${dia}.gz`,
      contentType: 'application/gzip'
    });
  } catch (error) {
    sendRBMCProxyError(res, error, 'Failed to fetch multiconstellation orbits.');
  }
});

app.get('/api/rbmc/availability/:estacao/:ano/:dia/:hora/:minuto/:tipo', async (req, res) => {
  try {
    const ano = parseIntParam(req.params.ano);
    const dia = parseIntParam(req.params.dia);
    const hora = parseIntParam(req.params.hora);
    const minuto = parseIntParam(req.params.minuto);
    const tipo = String(req.params.tipo || '').toUpperCase();

    const validMinute = [0, 15, 30, 45].includes(minuto);
    const validHour = Number.isInteger(hora) && hora >= 0 && hora <= 23;
    const validType = tipo === 'MO' || tipo === 'MN';

    if (!isValidYear(ano) || !isValidDay(dia) || !validHour || !validMinute || !validType) {
      return res.status(400).json({ error: 'Invalid parameters for availability check.' });
    }

    const extraCandidates = String(req.query.candidates || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const candidates = buildStationCodeCandidates([req.params.estacao, ...extraCandidates]);
    if (candidates.length === 0) {
      return res.status(400).json({ error: 'No valid station code candidates.' });
    }

    const actions = {
      report: (code) => `${RBMC_API_BASE_URL}/relatorio/${code.toLowerCase()}`,
      rinex2: (code) => `${RBMC_API_BASE_URL}/dados/rinex2/${code.toLowerCase()}/${ano}/${dia}`,
      rinex3: (code) => `${RBMC_API_BASE_URL}/dados/rinex3/${code.toLowerCase()}/${ano}/${dia}`,
      rinex31s: (code) => `${RBMC_API_BASE_URL}/dados/rinex3/1s/${code.toLowerCase()}/${ano}/${dia}/${hora}/${minuto}/${tipo.toLowerCase()}`,
      orbitas: () => `${RBMC_API_BASE_URL}/dados/rinex3/orbitas/${ano}/${dia}`
    };

    const resolvedCodes = {
      report: null,
      rinex2: null,
      rinex3: null,
      rinex31s: null
    };

    for (const code of candidates) {
      if (!resolvedCodes.report && await checkRBMCAvailability(actions.report(code))) resolvedCodes.report = code;
      if (!resolvedCodes.rinex2 && await checkRBMCAvailability(actions.rinex2(code))) resolvedCodes.rinex2 = code;
      if (!resolvedCodes.rinex3 && await checkRBMCAvailability(actions.rinex3(code))) resolvedCodes.rinex3 = code;
      if (!resolvedCodes.rinex31s && await checkRBMCAvailability(actions.rinex31s(code))) resolvedCodes.rinex31s = code;

      if (resolvedCodes.report && resolvedCodes.rinex2 && resolvedCodes.rinex3 && resolvedCodes.rinex31s) {
        break;
      }
    }

    const orbitasAvailable = await checkRBMCAvailability(actions.orbitas());

    return res.json({
      candidates,
      resolvedCodes,
      available: {
        report: Boolean(resolvedCodes.report),
        rinex2: Boolean(resolvedCodes.rinex2),
        rinex3: Boolean(resolvedCodes.rinex3),
        rinex31s: Boolean(resolvedCodes.rinex31s),
        orbitas: orbitasAvailable
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to check RBMC availability.', message: error.message });
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
