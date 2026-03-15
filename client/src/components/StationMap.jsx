import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, useTranslation } from '../i18n.jsx';

const StationMap = ({ stations }) => {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const t = useTranslation(language);

  // Center of Brazil
  const center = [-14.235, -51.9253];

  // Tile layer URLs based on theme
  const tileUrl = theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // Create custom icons for online/offline stations
  const onlineIcon = useMemo(() => {
    const html = `
      <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="#44ff44" opacity="0.9"/>
          <circle cx="16" cy="16" r="12" fill="#00f2fe" opacity="0.3"/>
          <circle cx="16" cy="16" r="6" fill="#44ff44"/>
          <circle cx="16" cy="16" r="3" fill="white"/>
        </svg>
      </div>
    `;

    return L.divIcon({
      html: html,
      className: 'custom-marker online-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
      tooltipAnchor: [0, -20]
    });
  }, []);

  const offlineIcon = useMemo(() => {
    const html = `
      <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="#ff6b6b" opacity="0.9"/>
          <circle cx="16" cy="16" r="12" fill="#00f2fe" opacity="0.1"/>
          <circle cx="16" cy="16" r="6" fill="#ff6b6b"/>
          <circle cx="16" cy="16" r="3" fill="white"/>
        </svg>
      </div>
    `;

    return L.divIcon({
      html: html,
      className: 'custom-marker offline-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
      tooltipAnchor: [0, -20]
    });
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={4}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
      scrollWheelZoom={true}
      className="station-map-container"
    >
      <TileLayer
        attribution={tileAttribution}
        url={tileUrl}
        maxZoom={19}
      />
      {stations.map((station) => (
        <Marker
          key={station.mountpoint}
          position={[station.latitude, station.longitude]}
          icon={station.online ? onlineIcon : offlineIcon}
          title={station.mountpoint}
        >
          <Tooltip
            direction="top"
            offset={[0, -15]}
            opacity={0.9}
            permanent={false}
            className="station-tooltip"
          >
            <div className="tooltip-content">
              <strong>{station.mountpoint}</strong>
              <div style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>
                <div>{station.identifier}</div>
                <div style={{ color: station.online ? '#44ff44' : '#ff6b6b' }}>
                  {station.online ? '🟢 Online' : '🔴 Offline'}
                </div>
              </div>
            </div>
          </Tooltip>
          <Popup className="station-popup" maxWidth={300} minWidth={250}>
            <div className="popup-content">
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#00f2fe', fontFamily: 'JetBrains Mono', fontSize: '1.1rem' }}>
                {station.mountpoint}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#a0a0a0' }}>Status</span>
                <span style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  background: station.online ? 'rgba(68, 255, 68, 0.15)' : 'rgba(255, 107, 107, 0.15)',
                  color: station.online ? '#44ff44' : '#ff6b6b',
                  border: `1px solid ${station.online ? 'rgba(68, 255, 68, 0.4)' : 'rgba(255, 107, 107, 0.4)'}`
                }}>
                  {station.online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="popup-details">
                <div className="detail-item">
                  <span className="detail-label">Identifier:</span>
                  <span className="detail-value">{station.identifier}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Location:</span>
                  <span className="detail-value">{station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Format:</span>
                  <span className="detail-value">{station.format}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Systems:</span>
                  <span className="detail-value">{station.navSystem}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Equipment:</span>
                  <span className="detail-value">{station.details}</span>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                <ExternalLink size={14} />
                <a
                  href={`https://www.ibge.gov.br`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#00f2fe', textDecoration: 'none', cursor: 'pointer' }}
                  title="Learn more about IBGE"
                >
                  IBGE Reference
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default StationMap;
