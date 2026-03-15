import React from 'react';
import StationCard from './StationCard';
import { useLanguage, useTranslation } from '../i18n.jsx';

const StationList = ({ stations }) => {
  const { language } = useLanguage();
  const t = useTranslation(language);

  if (stations.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-content">
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity: 0.5, marginBottom: '1rem' }}
          >
            <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="2" />
            <path d="M40 25V40M40 50V55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="55" cy="40" r="3" fill="currentColor" />
            <circle cx="25" cy="40" r="3" fill="currentColor" />
          </svg>
          <h3>{t('noStationsFound')}</h3>
          <p>{t('tryAdjusting')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="station-list-container">
      {stations.map((station) => (
        <StationCard key={station.mountpoint} station={station} />
      ))}
    </div>
  );
};

export default StationList;
