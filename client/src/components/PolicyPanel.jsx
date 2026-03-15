import React from 'react';
import { ExternalLink, Lock, Shield, FileText, Database } from 'lucide-react';
import { useLanguage, useTranslation } from '../i18n.jsx';

const links = {
  ibge: 'https://www.ibge.gov.br',
  apiDocs: 'https://servicodados.ibge.gov.br/api/docs',
  rbmcDocs: 'https://servicodados.ibge.gov.br/api/docs/rbmc',
  lai: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm',
};

const PolicyPanel = () => {
  const { language } = useLanguage();
  const t = useTranslation(language);

  return (
    <section className="policy-panel" aria-label={t('privacyAndDocs')}>
      <header className="policy-hero">
        <h2>{t('privacyAndDocs')}</h2>
        <p>{t('policyIntro')}</p>
      </header>

      <div className="policy-grid">
        <article className="policy-card">
          <h3>
            <Shield size={18} />
            {t('policyDataUseTitle')}
          </h3>
          <ul>
            <li>{t('policyDataUse1')}</li>
            <li>{t('policyDataUse2')}</li>
            <li>{t('policyDataUse3')}</li>
            <li>{t('policyDataUse4')}</li>
          </ul>
        </article>

        <article className="policy-card">
          <h3>
            <Lock size={18} />
            {t('policyPrivacyTitle')}
          </h3>
          <ul>
            <li>{t('policyPrivacy1')}</li>
            <li>{t('policyPrivacy2')}</li>
            <li>{t('policyPrivacy3')}</li>
            <li>{t('policyPrivacy4')}</li>
          </ul>
        </article>

        <article className="policy-card">
          <h3>
            <Database size={18} />
            {t('policyIbgeTitle')}
          </h3>
          <ul>
            <li>{t('policyIbge1')}</li>
            <li>{t('policyIbge2')}</li>
            <li>{t('policyIbge3')}</li>
            <li>{t('policyIbge4')}</li>
          </ul>
        </article>

        <article className="policy-card">
          <h3>
            <FileText size={18} />
            {t('policyRefsTitle')}
          </h3>
          <div className="policy-links">
            <a href={links.ibge} target="_blank" rel="noopener noreferrer">
              IBGE
              <ExternalLink size={14} />
            </a>
            <a href={links.apiDocs} target="_blank" rel="noopener noreferrer">
              API Servico de Dados
              <ExternalLink size={14} />
            </a>
            <a href={links.rbmcDocs} target="_blank" rel="noopener noreferrer">
              Documentacao RBMC
              <ExternalLink size={14} />
            </a>
            <a href={links.lai} target="_blank" rel="noopener noreferrer">
              Lei de Acesso a Informacao (12.527/2011)
              <ExternalLink size={14} />
            </a>
          </div>
        </article>
      </div>
    </section>
  );
};

export default PolicyPanel;