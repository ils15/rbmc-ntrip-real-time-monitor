import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StationCard from './StationCard';

// Mock i18n module
vi.mock('../i18n.jsx', () => ({
  useLanguage: () => ({ language: 'pt' }),
  useTranslation: () => (key) => {
    const translations = {
      pt: {
        coordinates: 'Coordenadas',
        format: 'Formato',
        navigationSystems: 'Sistemas de Navegação',
        equipment: 'Equipamento',
        dataQualityExcellent: 'Qualidade de Dados: Excelente',
        dataQualityUnavailable: 'Qualidade de Dados: Indisponível',
        showOnMap: 'Ver no mapa',
        reportsAndRinex: 'Relatórios & RINEX',
      },
    };
    return translations.pt[key] || key;
  },
}));

const mockStation = {
  mountpoint: 'TEST-MTP',
  identifier: 'TEST-ID',
  latitude: -15.1234,
  longitude: -47.5678,
  online: true,
  format: 'RTCM v3',
  navSystem: 'GPS+GLONASS+Galileo',
  details: 'GNSS Receiver',
};

describe('StationCard', () => {
  it('renders mountpoint', () => {
    render(<StationCard station={mockStation} />);
    expect(screen.getByText('TEST-MTP')).toBeInTheDocument();
  });

  it('renders identifier', () => {
    render(<StationCard station={mockStation} />);
    expect(screen.getByText('TEST-ID')).toBeInTheDocument();
  });

  it('renders online status badge', () => {
    render(<StationCard station={mockStation} />);
    const badge = screen.getByRole('status');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Online');
  });

  it('renders offline status badge when station is offline', () => {
    const offlineStation = { ...mockStation, online: false };
    render(<StationCard station={offlineStation} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Offline');
  });

  it('renders coordinates', () => {
    render(<StationCard station={mockStation} />);
    expect(screen.getByText(/-15\.1234/)).toBeInTheDocument();
    expect(screen.getByText(/-47\.5678/)).toBeInTheDocument();
  });

  it('renders format info', () => {
    render(<StationCard station={mockStation} />);
    expect(screen.getByText('RTCM v3')).toBeInTheDocument();
  });

  it('renders show on map button and triggers callback', () => {
    const onShowOnMap = vi.fn();
    render(<StationCard station={mockStation} onShowOnMap={onShowOnMap} />);
    const showOnMapBtn = screen.getByRole('button', { name: /ver no mapa/i });
    expect(showOnMapBtn).toBeInTheDocument();
    fireEvent.click(showOnMapBtn);
    expect(onShowOnMap).toHaveBeenCalledWith(mockStation);
  });

  it('renders reports button and triggers callback', () => {
    const onOpenDownloads = vi.fn();
    render(<StationCard station={mockStation} onOpenDownloads={onOpenDownloads} />);
    const reportsBtn = screen.getByRole('button', { name: /relatórios/i });
    expect(reportsBtn).toBeInTheDocument();
    fireEvent.click(reportsBtn);
    expect(onOpenDownloads).toHaveBeenCalledWith(mockStation);
  });
});
