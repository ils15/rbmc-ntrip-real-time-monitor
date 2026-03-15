import { createContext, useContext, useState, useEffect } from 'react';

export const translations = {
  pt: {
    // Header
    searchPlaceholder: 'Buscar estações...',
    filterByStatus: 'Filtrar por status',
    refresh: 'Atualizar',
    mapView: 'Visualização do mapa',
    listView: 'Visualização em lista',
    privacyAndDocs: 'Privacidade e Documentação',
    searchSuggestions: 'Sugestões de busca',

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

    // Privacy & docs panel
    policyIntro: 'Esta seção resume como os dados de estações são exibidos, protegidos e referenciados no sistema.',
    policyDataUseTitle: 'Uso de Dados',
    policyDataUse1: 'A aplicação mostra dados públicos de estações GNSS para monitoramento técnico.',
    policyDataUse2: 'A busca pode ser feita por identificador, mountpoint, nome da estação e estado (UF).',
    policyDataUse3: 'Os dados exibidos priorizam fonte NTRIP em tempo real, com fallback para fonte IBGE.',
    policyDataUse4: 'As informações são exibidas para apoio operacional e não substituem validação oficial de campo.',
    policyPrivacyTitle: 'Privacidade',
    policyPrivacy1: 'Nenhum dado pessoal sensível é coletado no fluxo principal do monitor.',
    policyPrivacy2: 'Preferências locais de interface (tema e idioma) são salvas no navegador do usuário.',
    policyPrivacy3: 'As requisições de dados de estações são tratadas no backend para reduzir exposição de origem externa.',
    policyPrivacy4: 'Logs técnicos podem existir para observabilidade, sem finalidade de perfilamento individual.',
    policyIbgeTitle: 'Política de Referência IBGE',
    policyIbge1: 'Fonte pública: IBGE / Serviço de Dados (RBMC).',
    policyIbge2: 'Acesso público sem autenticação obrigatória.',
    policyIbge3: 'Reuso permitido, mantendo atribuição da fonte.',
    policyIbge4: 'Sempre referenciar a origem quando exportar ou publicar os dados.',
    policyRefsTitle: 'Referências Oficiais',
  },
  en: {
    // Header
    searchPlaceholder: 'Search stations...',
    filterByStatus: 'Filter by status',
    refresh: 'Refresh',
    mapView: 'Map view',
    listView: 'List view',
    privacyAndDocs: 'Privacy & Documentation',
    searchSuggestions: 'Search suggestions',

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

    // Privacy & docs panel
    policyIntro: 'This section summarizes how station data is displayed, protected, and referenced in the system.',
    policyDataUseTitle: 'Data Usage',
    policyDataUse1: 'The application displays public GNSS station data for technical monitoring.',
    policyDataUse2: 'Search supports station identifier, mountpoint, station name, and state (UF).',
    policyDataUse3: 'Displayed data prioritizes real-time NTRIP source, with IBGE as fallback.',
    policyDataUse4: 'Information supports operations and does not replace official field validation.',
    policyPrivacyTitle: 'Privacy',
    policyPrivacy1: 'No sensitive personal data is collected in the monitor core flow.',
    policyPrivacy2: 'Local UI preferences (theme and language) are stored in the user browser.',
    policyPrivacy3: 'Station data requests are handled by the backend to reduce direct external source exposure.',
    policyPrivacy4: 'Technical logs may exist for observability without individual profiling purposes.',
    policyIbgeTitle: 'IBGE Reference Policy',
    policyIbge1: 'Public source: IBGE / Servico de Dados (RBMC).',
    policyIbge2: 'Public access without mandatory authentication.',
    policyIbge3: 'Reuse is allowed while keeping source attribution.',
    policyIbge4: 'Always reference origin when exporting or publishing data.',
    policyRefsTitle: 'Official References',
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
