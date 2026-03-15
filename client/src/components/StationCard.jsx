import React, { useRef, useEffect, useState } from 'react';
import { Download, Signal, WifiOff, MapPin, Wifi, Radio } from 'lucide-react';
import jsPDF from 'jspdf';
import { useLanguage, useTranslation } from '../i18n.jsx';

const StationCard = ({ station }) => {
  const { language } = useLanguage();
  const t = useTranslation(language);

  const generatePDF = async () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Colors
    const primaryColor = [0, 242, 254]; // #00f2fe
    const bgColor = [11, 14, 20]; // #0b0e14
    const textColor = [224, 224, 224]; // #e0e0e0
    const onlineColor = [68, 255, 68]; // #44ff44
    const offlineColor = [255, 107, 107]; // #ff6b6b

    // Background
    doc.setFillColor(...bgColor);
    doc.rect(0, 0, 210, 297, 'F');

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(11, 14, 20);
    doc.setFontSize(28);
    doc.setFont('courier', 'bold');
    doc.text('RBMC STATION', 20, 25);

    // Station Name
    doc.setTextColor(...textColor);
    doc.setFontSize(20);
    doc.setFont('courier', 'bold');
    doc.text(station.mountpoint, 20, 55);

    // Status Badge
    const statusColor = station.online ? onlineColor : offlineColor;
    doc.setFillColor(...statusColor);
    doc.rect(20, 58, 40, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('courier', 'bold');
    doc.text(station.online ? 'ONLINE' : 'OFFLINE', 25, 64);

    // Content
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    let yPos = 75;
    const lineHeight = 8;
    const labels = [
      { label: 'Identifier:', value: station.identifier },
      { label: 'Network:', value: station.mountpoint },
      { label: 'Location:', value: `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}` },
      { label: 'Format:', value: station.format },
      { label: 'Navigation Systems:', value: station.navSystem },
      { label: 'Equipment:', value: station.details },
    ];

    labels.forEach(({ label, value }) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(label, 20, yPos);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      const lines = doc.splitTextToSize(value, 160);
      doc.text(lines, 60, yPos);

      yPos += lineHeight * (1 + lines.length - 1) + 3;
    });

    // Footer
    doc.setTextColor(160, 160, 160);
    doc.setFontSize(8);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 287);
    doc.text('RBMC Real-Time Monitor', 140, 287);

    // Save PDF
    doc.save(`${station.mountpoint}-report.pdf`);
  };

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

      <div className="card-footer">
        <button
          className="btn-secondary"
          onClick={generatePDF}
          aria-label={t('downloadReport')}
          title={t('downloadReport')}
        >
          <Download size={16} />
          {t('downloadReport')}
        </button>
      </div>
    </div>
  );
};

export default StationCard;
