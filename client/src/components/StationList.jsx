import React, { useEffect, useMemo, useState } from 'react';
import StationCard from './StationCard';
import DownloadModal from './downloads/DownloadModal';
import { useLanguage, useTranslation } from '../i18n.jsx';

const STATIONS_PER_PAGE = 15;

const StationList = ({ stations, onShowOnMap }) => {
  const { language } = useLanguage();
  const t = useTranslation(language);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStation, setSelectedStation] = useState(null);

  const totalPages = Math.max(1, Math.ceil(stations.length / STATIONS_PER_PAGE));
  const paginatedStations = useMemo(() => {
    const start = (currentPage - 1) * STATIONS_PER_PAGE;
    return stations.slice(start, start + STATIONS_PER_PAGE).slice(0, STATIONS_PER_PAGE);
  }, [currentPage, stations]);

  const pageStart = stations.length === 0 ? 0 : (currentPage - 1) * STATIONS_PER_PAGE + 1;

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [stations]);

  const goToPage = (nextPage) => {
    setCurrentPage(nextPage);
  };

  useEffect(() => {
    // Run after page render to ensure scroll reset always applies.
    const frame = window.requestAnimationFrame(() => {
      const content = document.querySelector('.content');
      if (content && typeof content.scrollTo === 'function') {
        content.scrollTo({ top: 0, behavior: 'auto' });
      }

      window.scrollTo({ top: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentPage]);

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
    <section className="station-list-section">
      <div key={currentPage} className="station-list-container page-transition">
        {paginatedStations.map((station) => (
          <StationCard 
            key={station.mountpoint} 
            station={station} 
            onOpenDownloads={setSelectedStation}
            onShowOnMap={onShowOnMap}
          />
        ))}
      </div>

      <div className="pagination-controls" aria-label={t('pagination')}> 
        <button
          type="button"
          className="pagination-button"
          onClick={() => goToPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          {t('previous')}
        </button>

        <span className="pagination-summary">
          {pageStart}/{stations.length}
        </span>

        <button
          type="button"
          className="pagination-button"
          onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          {t('next')}
        </button>
      </div>

      {selectedStation && (
        <DownloadModal 
          station={selectedStation} 
          onClose={() => setSelectedStation(null)} 
        />
      )}
    </section>
  );
};

export default StationList;
