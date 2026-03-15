import { createContext, useContext, useState, useEffect } from 'react';

export const translations = {
  pt: {
    // Header
    searchPlaceholder: 'Buscar estações...',
    filterByStatus: 'Filtrar por status',
    refresh: 'Atualizar',
    mapView: 'Visualização do mapa',
    listView: 'Visualização em lista',

    // Status
    allStations: 'Todas',
    online: 'Online',
    offline: 'Offline',

    // StationCard
    coordinates: 'Coordenadas',
    format: 'Formato',
    navigationSystems: 'Sistemas de Navegação',
    equipment: 'Equipamento',
    dataQualityExcellent: 'Qualidade de Dados: Excelente',
    dataQualityUnavailable: 'Qualidade de Dados: Indisponível',
    downloadReport: 'Baixar Relatório',

    // Footer
    stations: 'Estações',
    updated: 'Atualizado',
    source: 'Fonte',
    nrtipCaster: 'NTRIP Caster',

    // Messages
    loading: 'Carregando dados do RBMC...',
    fetchError: 'Não foi possível carregar os dados',
    noStationsFound: 'Nenhuma estação encontrada',
    tryAdjusting: 'Tente ajustar sua busca ou filtros para encontrar estações RBMC',

    // Theme
    lightMode: 'Modo claro',
    darkMode: 'Modo escuro',

    // Language
    englishUS: 'English',
    portugueseBR: 'Português',
  },
  en: {
    // Header
    searchPlaceholder: 'Search stations...',
    filterByStatus: 'Filter by status',
    refresh: 'Refresh',
    mapView: 'Map view',
    listView: 'List view',

    // Status
    allStations: 'All',
    online: 'Online',
    offline: 'Offline',

    // StationCard
    coordinates: 'Coordinates',
    format: 'Format',
    navigationSystems: 'Navigation Systems',
    equipment: 'Equipment',
    dataQualityExcellent: 'Data Quality: Excellent',
    dataQualityUnavailable: 'Data Quality: Unavailable',
    downloadReport: 'Download Report',

    // Footer
    stations: 'Stations',
    updated: 'Updated',
    source: 'Source',
    nrtipCaster: 'NTRIP Caster',

    // Messages
    loading: 'Fetching RBMC data...',
    fetchError: 'Failed to load stations',
    noStationsFound: 'No stations found',
    tryAdjusting: 'Try adjusting your search or filters to find RBMC stations',

    // Theme
    lightMode: 'Light mode',
    darkMode: 'Dark mode',

    // Language
    englishUS: 'English',
    portugueseBR: 'Português',
  },
};

export const useTranslation = (language) => {
  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language] || translations.pt;
    
    for (const k of keys) {
      value = value?.[k];
      if (!value) return key;
    }
    
    return value;
  };
  
  return t;
};

// Language Context
const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'pt';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
