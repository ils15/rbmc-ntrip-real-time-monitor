import React from 'react';
import { Signal, WifiOff, MapPin, Wifi, Radio, FileText, Crosshair } from 'lucide-react';
import { useLanguage, useTranslation } from '../i18n.jsx';

const StationCard = ({ station, onOpenDownloads, onShowOnMap }) => {
  const { language } = useLanguage();
  const t = useTranslation(language);

  return (
    <div className="station-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{station.mountpoint}</h3>
          <p className="card-identifier">{station.identifier}</p>
        </div>
        <div className="card-actions">
          <span
            className={`status-badge ${station.online ? 'online' : 'offline'}`}
            aria-label={station.online ? 'Online' : 'Offline'}
            role="status"
          >
            {station.online ? (
              <>
                <Signal size={14} />
                Online
              </>
            ) : (
              <>
                <WifiOff size={14} />
                Offline
              </>
            )}
          </span>
        </div>
      </div>

      <div className="card-content">
        <div className="info-grid">
          <div className="info-item">
            <MapPin size={16} className="info-icon" />
            <div>
              <span className="info-label">{t('coordinates')}</span>
              <span className="info-value">
                {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="info-item">
            <Wifi size={16} className="info-icon" />
            <div>
              <span className="info-label">{t('format')}</span>
              <span className="info-value">{station.format}</span>
            </div>
          </div>

          <div className="info-item">
            <Radio size={16} className="info-icon" />
            <div>
              <span className="info-label">{t('navigationSystems')}</span>
              <span className="info-value">{station.navSystem}</span>
            </div>
          </div>

          <div className="info-item">
            <span className="info-label">{t('equipment')}</span>
            <span className="info-value">{station.details}</span>
          </div>
        </div>

        <div className="data-quality" style={{ marginTop: '1rem' }}>
          <div className="quality-indicator">
            <span className="quality-dot" style={{ background: station.online ? '#44ff44' : '#ff6b6b' }}></span>
            <span className="quality-text">
              {station.online ? t('dataQualityExcellent') : t('dataQualityUnavailable')}
            </span>
          </div>
        </div>
      </div>

      <div className="card-footer card-footer-actions">
        <button
          className="btn-secondary"
          onClick={() => onShowOnMap?.(station)}
          aria-label={t('showOnMap')}
        >
          <Crosshair size={16} />
          {t('showOnMap')}
        </button>
        <button
          className="btn-primary"
          onClick={() => onOpenDownloads(station)}
          aria-label={t('reportsAndRinex') || 'Relatórios & RINEX'}
        >
          <FileText size={16} style={{ marginRight: '8px' }} />
          {t('reportsAndRinex') || 'Relatórios & RINEX'}
        </button>
      </div>
    </div>
  );
};

export default StationCard;
