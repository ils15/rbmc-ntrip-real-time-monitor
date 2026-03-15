import React, { useMemo, useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useLanguage, useTranslation } from '../../i18n.jsx';

const DownloadModal = ({ station, onClose }) => {
  const { language } = useLanguage();
  const t = useTranslation(language);
  const now = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - startOfYear) / 86400000);

  const [rinexYear, setRinexYear] = useState(now.getFullYear());
  const [rinexDay, setRinexDay] = useState(dayOfYear);
  const [rinexHour, setRinexHour] = useState(now.getHours());
  const [rinexMinute, setRinexMinute] = useState(Math.floor(now.getMinutes() / 15) * 15);
  const [rinexType, setRinexType] = useState('MO');
  const [downloadingAction, setDownloadingAction] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availability, setAvailability] = useState({
    report: true,
    rinex2: true,
    rinex3: true,
    rinex31s: true,
    orbitas: true
  });
  const [resolvedCodes, setResolvedCodes] = useState({
    report: '',
    rinex2: '',
    rinex3: '',
    rinex31s: ''
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const candidateCodes = useMemo(() => {
    if (!station) return [];
    const normalize = (input) => {
      const raw = String(input || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      if (raw.length === 5 && raw.endsWith('0')) return raw.slice(0, 4);
      return raw.slice(0, 4);
    };

    const raw = [station.mountpoint, station.identifier, station.name];
    const codes = raw
      .map(normalize)
      .filter((code) => code.length === 4);

    return Array.from(new Set(codes));
  }, [station]);

  const stationSigla = resolvedCodes.report || resolvedCodes.rinex2 || candidateCodes[0] || '';

  useEffect(() => {
    let cancelled = false;

    const fetchAvailability = async () => {
      if (!candidateCodes.length) return;
      setAvailabilityLoading(true);

      try {
        const primary = candidateCodes[0];
        const extras = candidateCodes.slice(1).join(',');
        const url = `/api/rbmc/availability/${primary}/${rinexYear}/${rinexDay}/${rinexHour}/${rinexMinute}/${rinexType}?candidates=${encodeURIComponent(extras)}`;
        const response = await fetch(url);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || (language === 'pt' ? 'Falha ao verificar disponibilidade.' : 'Failed to check availability.'));
        }

        if (cancelled) return;
        setAvailability(payload.available || {});
        setResolvedCodes(payload.resolvedCodes || {});
      } catch (error) {
        if (!cancelled) {
          setAvailability({ report: false, rinex2: false, rinex3: false, rinex31s: false, orbitas: false });
          setResolvedCodes({ report: '', rinex2: '', rinex3: '', rinex31s: '' });
          setDownloadError(error.message);
        }
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    };

    fetchAvailability();

    return () => {
      cancelled = true;
    };
  }, [candidateCodes, rinexYear, rinexDay, rinexHour, rinexMinute, rinexType, language]);

  const downloadFromApi = async (url, actionLabel, fallbackFileName) => {
    try {
      setDownloadError('');
      setDownloadingAction(actionLabel);

      const response = await fetch(url);
      if (!response.ok) {
        let backendMessage = '';
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = await response.json().catch(() => null);
          backendMessage = payload?.error || payload?.message || '';
        }

        const defaultError = language === 'pt'
          ? 'Falha no download. Tente uma data mais antiga (D-2 até D-7).'
          : 'Download failed. Try an older date (D-2 to D-7).';

        throw new Error(backendMessage || defaultError);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = fallbackFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setDownloadError(error.message);
    } finally {
      setDownloadingAction('');
    }
  };

  if (!station) return null;

  const applyRelativeDate = (daysBack) => {
    const d = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const s = new Date(d.getFullYear(), 0, 0);
    const doy = Math.floor((d - s) / 86400000);
    setRinexYear(d.getFullYear());
    setRinexDay(doy);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{t('downloadsFor')} {station.mountpoint}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>
        <div className="modal-body">
          <div className="download-section">
            <h3>{t('officialReport')}</h3>
            {availability.report && resolvedCodes.report && (
              <button
                className="btn-primary"
                onClick={() => downloadFromApi(
                  `/api/rbmc/relatorio/${resolvedCodes.report}`,
                  'relatorio',
                  `${resolvedCodes.report}-relatorio-rbmc.pdf`
                )}
                disabled={Boolean(downloadingAction) || availabilityLoading}
              >
                <Download size={16} />
                {t('downloadPdf')}
              </button>
            )}
          </div>

          <div className="download-section">
            <h3>{t('rinexData')}</h3>
            <p className="rinex-help">{t('rinexAvailabilityHint')}</p>
            <div className="rinex-quick-dates">
              <button type="button" className="btn-date-chip" onClick={() => applyRelativeDate(2)}>D-2</button>
              <button type="button" className="btn-date-chip" onClick={() => applyRelativeDate(3)}>D-3</button>
              <button type="button" className="btn-date-chip" onClick={() => applyRelativeDate(7)}>D-7</button>
            </div>
            <div className="rinex-form-grid">
              <label>
                {t('year')}
                <input
                  type="number"
                  min="1990"
                  max="2100"
                  value={rinexYear}
                  onChange={(e) => setRinexYear(Number(e.target.value))}
                />
              </label>
              <label>
                {t('day')}
                <input
                  type="number"
                  min="1"
                  max="366"
                  value={rinexDay}
                  onChange={(e) => setRinexDay(Number(e.target.value))}
                />
              </label>
              <label>
                {t('hour')}
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={rinexHour}
                  onChange={(e) => setRinexHour(Number(e.target.value))}
                />
              </label>
              <label>
                {t('minute')}
                <select value={rinexMinute} onChange={(e) => setRinexMinute(Number(e.target.value))}>
                  <option value={0}>00</option>
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                </select>
              </label>
              <label>
                {t('type')}
                <select value={rinexType} onChange={(e) => setRinexType(e.target.value)}>
                  <option value="MO">MO</option>
                  <option value="MN">MN</option>
                </select>
              </label>
            </div>

            <div className="rinex-actions-grid">
              {availability.rinex2 && resolvedCodes.rinex2 && (
                <button
                  className="btn-secondary"
                  onClick={() => downloadFromApi(
                    `/api/rbmc/rinex2/${resolvedCodes.rinex2}/${rinexYear}/${rinexDay}`,
                    'rinex2',
                    `${resolvedCodes.rinex2}-rinex2-${rinexYear}-${rinexDay}.zip`
                  )}
                  disabled={Boolean(downloadingAction) || availabilityLoading}
                >
                  {t('rinex2Daily')}
                </button>
              )}
              {availability.rinex3 && resolvedCodes.rinex3 && (
                <button
                  className="btn-secondary"
                  onClick={() => downloadFromApi(
                    `/api/rbmc/rinex3/${resolvedCodes.rinex3}/${rinexYear}/${rinexDay}`,
                    'rinex3',
                    `${resolvedCodes.rinex3}-rinex3-${rinexYear}-${rinexDay}.gz`
                  )}
                  disabled={Boolean(downloadingAction) || availabilityLoading}
                >
                  {t('rinex3Daily')}
                </button>
              )}
              {availability.rinex31s && resolvedCodes.rinex31s && (
                <button
                  className="btn-secondary"
                  onClick={() => downloadFromApi(
                    `/api/rbmc/rinex3-1s/${resolvedCodes.rinex31s}/${rinexYear}/${rinexDay}/${rinexHour}/${rinexMinute}/${rinexType}`,
                    'rinex3-1s',
                    `${resolvedCodes.rinex31s}-rinex3-1s-${rinexYear}-${rinexDay}-${rinexHour}-${rinexMinute}-${rinexType}.gz`
                  )}
                  disabled={Boolean(downloadingAction) || availabilityLoading}
                >
                  {t('rinex31s')}
                </button>
              )}
              {availability.orbitas && (
                <button
                  className="btn-secondary"
                  onClick={() => downloadFromApi(
                    `/api/rbmc/orbitas/${rinexYear}/${rinexDay}`,
                    'orbitas',
                    `orbitas-${rinexYear}-${rinexDay}.gz`
                  )}
                  disabled={Boolean(downloadingAction) || availabilityLoading}
                >
                  {t('orbitas')}
                </button>
              )}
            </div>
            
            <div className="rinex-meta">
              <span>{t('stationCodeUsed')}: {stationSigla || '—'}</span>
              {availabilityLoading && <span>{t('checkingAvailability')}</span>}
              {!availability.report && !availability.rinex2 && !availability.rinex3 && !availability.rinex31s && !availability.orbitas && (
                <span className="rinex-warning">{t('noFilesForDate')}</span>
              )}
              {downloadingAction && <span>{t('downloading')}</span>}
              {downloadError && <span className="rinex-error">{downloadError}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;
