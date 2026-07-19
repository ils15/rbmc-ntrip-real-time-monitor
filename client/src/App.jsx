import React, { useState, useEffect, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { Activity, Search, Map as MapIcon, List, Info, Database, RefreshCcw, AlertCircle, Sun, Moon, Globe, ShieldCheck } from 'lucide-react';
import StationMap from './components/StationMap';
import StationList from './components/StationList';
import PolicyPanel from './components/PolicyPanel';
import AvailabilityChart from './components/AvailabilityChart';
import { MapSkeleton, ListSkeleton } from './components/LoadingSkeleton';
import { useTheme } from './context/ThemeContext';
import { useLanguage, useTranslation } from './i18n.jsx';
import { useStationSSE } from './hooks/useStationSSE';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function App() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation(language);

  const [stations, setStations] = useState([]);
  const [filteredStations, setFilteredStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('map'); // map | list | policy
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // all | online | offline
  const [fetchError, setFetchError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [dataSource, setDataSource] = useState('');
  const [focusedStation, setFocusedStation] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);

  // Stable SSE update callback
  const handleSSEUpdate = useCallback((stations, source) => {
    const normalizedStations = stations.map((s) => normalizeStation(s, source));
    setStations(normalizedStations);
    setLastUpdated(new Date());
    setDataSource(source || 'SSE');
    setFetchError(null);
    setLoading(false);
  }, []);

  const handleSSEConnection = useCallback((connected) => {
    setSseConnected(connected);
  }, []);

  // SSE hook — only activate after initial data load
  useStationSSE(handleSSEUpdate, handleSSEConnection, stations.length > 0);

  const suggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    const seen = new Set();
    const result = [];

    stations.forEach((station) => {
      const candidates = [station.identifier, station.mountpoint, station.name, station.uf];

      candidates.forEach((candidate) => {
        if (!candidate || result.length >= 8) return;

        const value = String(candidate).trim();
        if (!value) return;

        const key = value.toLowerCase();
        if (key.includes(query) && !seen.has(key)) {
          seen.add(key);
          result.push(value);
        }
      });
    });

    return result;
  }, [searchTerm, stations]);

  useEffect(() => {
    fetchStations();
    // SSE handles subsequent updates; no polling needed
  }, []);

  // Normalize station data from different sources (IBGE vs NTRIP)
  const normalizeStation = (station, source = 'unknown') => {
    if (source === 'ibge' || station.sigla) {
      // IBGE format: {sigla, nome, latitude, longitude, uf, situacao, coordinate_system, equipment}
      return {
        id: station.id || station.sigla,
        identifier: station.sigla || station.id,
        mountpoint: station.name || station.nome || `${station.sigla}-${station.uf}`,
        name: station.name || station.nome,
        latitude: station.latitude,
        longitude: station.longitude,
        online: station.situacao === 'Ativo' || station.online === true,
        status: station.status || (station.situacao === 'Ativo' ? 'OPERATIONAL' : 'INACTIVE'),
        format: station.format || 'RTCM v3',
        navSystem: station.navSystem || 'GPS+GLONASS+Galileo',
        details: station.details || station.equipment || 'GNSS Receiver',
        coordinate_system: station.coordinate_system || 'SIRGAS2000/WGS84',
        uf: station.uf,
      };
    } else {
      // NTRIP format: already has identifier, mountpoint, etc
      return {
        id: station.id || station.mountpoint,
        identifier: station.identifier || station.mountpoint,
        mountpoint: station.mountpoint || station.identifier,
        name: station.name || station.mountpoint,
        latitude: station.latitude,
        longitude: station.longitude,
        online: station.online || false,
        status: station.status || 'UNKNOWN',
        format: station.format || 'RTCM v3',
        navSystem: station.navSystem || 'GPS+GLONASS+Galileo',
        details: station.details || 'GNSS Receiver',
        coordinate_system: station.coordinate_system || 'WGS84',
      };
    }
  };

  const fetchStations = async () => {
    setLoading(true);
    setFetchError(null);

    try {
      // Try IBGE endpoint first
      const response = await fetch('/api/stations-ibge');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to load stations');
      }

      const normalizedStations = (data.stations || []).map((s) => normalizeStation(s, 'ibge'));
      setStations(normalizedStations);
      setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : new Date());
      setIsStale(Boolean(data.isStale));
      setDataSource(data.source || 'IBGE');
      setLoading(false);
    } catch (error) {
      console.error('Error fetching from IBGE endpoint:', error);

      // Fallback to NTRIP
      try {
        const fallbackResponse = await fetch('/api/stations');
        const fallbackData = await fallbackResponse.json();

        if (!fallbackResponse.ok) {
          throw new Error(fallbackData?.message || 'Failed to load stations');
        }

        const normalizedStations = (fallbackData.stations || []).map((s) => normalizeStation(s, 'ntrip'));
        setStations(normalizedStations);
        setLastUpdated(fallbackData.lastUpdated ? new Date(fallbackData.lastUpdated) : new Date());
        setIsStale(Boolean(fallbackData.isStale));
        setDataSource(fallbackData.source || 'NTRIP');
        setLoading(false);
      } catch (fallbackError) {
        console.error('Error fetching from NTRIP fallback:', fallbackError);
        setFetchError(t('fetchError'));
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const filtered = stations.filter((s) => {
      const query = searchTerm.trim().toLowerCase();
      const searchableFields = [s.identifier, s.mountpoint, s.name, s.uf];
      const matchesSearch =
        query.length === 0 ||
        searchableFields.some((field) => String(field || '').toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'online' && s.online) ||
        (statusFilter === 'offline' && !s.online);

      return matchesSearch && matchesStatus;
    });

    setFilteredStations(filtered);
  }, [searchTerm, statusFilter, stations]);

  const handleShowOnMap = (station) => {
    setFocusedStation({ ...station, _focusTs: Date.now() });
    setView('map');
  };

  const handleInfo = (station) => {
    setSelectedStation(selectedStation === station.mountpoint ? null : station.mountpoint);
  };

  return (
    <div className="app-container">
      <header className="glass-header">
        <div className="logo-section">
          <Activity className="icon-pulse" />
          <h1>Monitor de Estações <span>NTRIP IBGE</span></h1>
        </div>
        <div className="search-bar glass" role="search">
          <Search size={18} />
          <label htmlFor="station-search" className="visually-hidden">{t('searchPlaceholder')}</label>
          <input
            id="station-search"
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="search-suggestions" role="listbox" aria-label={t('searchSuggestions')}>
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    className="suggestion-item"
                    onMouseDown={() => {
                      setSearchTerm(suggestion);
                      setShowSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="controls">
          <div className="status-filter glass">
            <label htmlFor="status-filter" className="visually-hidden">
              {t('filterByStatus')}
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={t('filterByStatus')}
            >
              <option value="all">{t('allStations')}</option>
              <option value="online">{t('online')}</option>
              <option value="offline">{t('offline')}</option>
            </select>
          </div>

          <nav className="view-toggle glass" aria-label={language === 'pt' ? 'Alternar visualização' : 'Toggle view'}>
            <button
              className={view === 'map' ? 'active' : ''}
              onClick={() => setView('map')}
              aria-label={t('mapView')}
              title={t('mapView')}
            >
              <MapIcon size={20} />
            </button>
            <button
              className={view === 'list' ? 'active' : ''}
              onClick={() => setView('list')}
              aria-label={t('listView')}
              title={t('listView')}
            >
              <List size={20} />
            </button>
            <button
              className={view === 'policy' ? 'active' : ''}
              onClick={() => setView('policy')}
              aria-label={t('privacyAndDocs')}
              title={t('privacyAndDocs')}
            >
              <ShieldCheck size={20} />
            </button>
          </nav>

          {/* Export Buttons */}
          <div className="export-section">
            <a href="/api/export/stations.csv" className="btn-export" download>
              Export CSV
            </a>
            <a href="/api/export/availability.csv" className="btn-export" download>
              Export Availability
            </a>
            <a href="/api/docs" className="btn-export" target="_blank" rel="noopener noreferrer">
              API Docs
            </a>
          </div>

          {/* Language Picker */}
          <div className="language-picker glass">
            <button
              className="lang-btn"
              onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
              aria-label={language === 'pt' ? t('englishUS') : t('portugueseBR')}
              title={language === 'pt' ? t('englishUS') : t('portugueseBR')}
            >
              <Globe size={18} />
              <span className="lang-code">{language.toUpperCase()}</span>
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            className="theme-toggle glass"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')}
            title={theme === 'dark' ? t('lightMode') : t('darkMode')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            className="refresh-button glass"
            onClick={fetchStations}
            aria-label={t('refresh')}
            disabled={loading}
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </header>

      <main className="content">
        {!sseConnected && stations.length > 0 && (
          <div className="offline-banner" role="status">
            {language === 'pt'
              ? 'Conexão perdida. Mostrando últimos dados conhecidos.'
              : 'Connection lost. Showing last known data.'}
          </div>
        )}

        {fetchError && (
          <div className="alert error" role="alert">
            <AlertCircle size={16} />
            <span>{t('fetchError')}: {fetchError}</span>
          </div>
        )}

        {loading && stations.length === 0 ? (
          <div className="loader">
            <div className="spinner"></div>
            <p>{t('loading')}</p>
          </div>
        ) : loading ? (
          view === 'map' ? <MapSkeleton /> : <ListSkeleton />
        ) : (
          view === 'policy' ? (
            <PolicyPanel />
          ) : view === 'map' ? (
            <StationMap stations={filteredStations} focusedStation={focusedStation} />
          ) : (
            <StationList stations={filteredStations} onShowOnMap={handleShowOnMap} />
          )
        )}

        {selectedStation && (
          <AvailabilityChart
            stationCode={selectedStation}
            onClose={() => setSelectedStation(null)}
          />
        )}
      </main>

      <footer className="glass-footer">
        <div className="stats">
          <Database size={14} />
          <span aria-live="polite" aria-atomic="true">{filteredStations.length} {t('stations')}</span>
          <span className="separator">|</span>
          <span>
            {t('updated')}: {lastUpdated ? lastUpdated.toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US') : '—'}
            {isStale ? ' (stale)' : ''}
          </span>
        </div>
        <div className="info">
          <Info size={14} />
          <span>{language === 'pt' ? 'Fonte: IBGE' : 'Source: IBGE'}</span>
          <span className="separator">|</span>
          <a
            href="https://servicodados.ibge.gov.br/api/docs/rbmc"
            target="_blank"
            rel="noopener noreferrer"
          >
            {language === 'pt' ? 'API RBMC' : 'RBMC API'}
          </a>
          <span className="separator">|</span>
          <a
            href="https://github.com/ils15"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub: @ils15
          </a>
          <span className="separator">|</span>
          <span>{language === 'pt' ? 'Feito por ils15 | Copyright 2026' : 'Made by ils15 | Copyright 2026'}</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
