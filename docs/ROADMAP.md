# Roadmap de Modernização — RBMC Monitor

> Estratégia de modernização em 5 fases (~90 dias), baseada no diagnóstico funcional
> realizado em 30/10/2026. Meta: plataforma confiável, moderna e observável.

## Diagnóstico atual (ponto de partida)

**O que funciona bem (validado em teste de ponta a ponta):**

- ✅ Dados ao vivo: 139–140 estações do caster NTRIP IBGE
- ✅ Relatórios oficiais: 8/8 PDFs válidos (ALAR, AMTE, BABJ, CEFT, CUIB, NAUS, POAL, UBER)
- ✅ RINEX 2 (4 MB) e RINEX 3 (6,9 MB) baixando com dados reais
- ✅ SSE em tempo real, cobertura regional, exportação CSV, SPA, validação de parâmetros
- ✅ 55 testes automatizados passando (45 backend + 10 frontend), CI com build + testes

**Gargalos identificados:**

| # | Problema | Impacto | Severidade |
|---|----------|---------|------------|
| 1 | **Viés de uptime**: estação offline some do caster e nunca é registrada (CEFT, POAL, UBER invisíveis) | Uptime sempre infla; quedas não aparecem | Alta |
| 2 | Histórico de disponibilidade começou do zero (30/10) e só grava quando há visitantes/SSE conectados | Dados de 30 dias demoram a ficar úteis | Alta |
| 3 | API IBGE instável (502 transitórios) sem retry no proxy | Falhas intermitentes ao baixar | Média |
| 4 | Rate limit global (100/15 min) aplica-se também a assets estáticos e SSE | Usuário ativo pode ser bloqueado | Média |
| 5 | Dependências defasadas: React 18→19, Vite 5→8, react-leaflet 4→5, redis 4→6, lucide 0.577→1.65, dotenv 16→18 | Dívida técnica crescente | Média |
| 6 | Sem Redis em produção: restart perde cache e setor de estações parte de zero | Lentidão pós-deploy | Média |
| 7 | Endpoint de órbitas retorna 404 no próprio IBGE (testado direto na fonte) | Feature morta na UI | Baixa |
| 8 | Sem testes E2E, sem Docker, sem PWA, sem log estruturado | Qualidade/operabilidade | Baixa |

---

## Fase 0 — Estabilização (semana 1) ✅ CONCLUÍDA em 30/10/2026

Objetivo: remover as falhas intermitentes sem mudar arquitetura.

- [x] **Retry no proxy IBGE**: `fetchBinaryWithRetry` — 3 tentativas com backoff (500 ms/1 s), falha rápida em 4xx (arquivo realmente inexistente).
- [x] **Rate limit apenas em `/api/*`**, teto 300/15 min; assets e SPA fora do limiter.
- [x] Dependências **menores** do backend atualizadas + `npm audit fix` → **0 vulnerabilidades**.
- [x] **Órbitas** removidas da UI (endpoint do IBGE retorna 404); backend mantido por compatibilidade.
- [x] Extra: CORS padrão libera a origem do GitHub Pages; helper `apiUrl()` no frontend permite API em origem separada (Pages + Render).
- **Aceite:** validado — downloads sem 502 após retry; `npm outdated` só reporta majors deliberadamente adiadas (redis 6, dotenv 18 → Fase 3).

## Fase 1 — Disponibilidade confiável (semanas 2–3)

Objetivo: transformar o tracker num histórico de verdade (corrige os gargalos 1 e 2).

- [ ] **Registro mestre de estações**: carregar lista oficial do IBGE (`/estacoes`) como base; estação da base ausente do caster = registrada como **offline** (fim do viés).
- [ ] **Agendador interno** (intervalo de 60 s já existente, desacoplado de visitantes): gravar disponibilidade mesmo sem ninguém conectado ao SSE.
- [ ] Diferenciar na API e na UI: `online` (no caster) × `offline` (na base, fora do caster) × `desconhecida` (não está em nenhuma).
- [ ] Opcional: backfill diário usando a checagem de disponibilidade RINEX (`/api/rbmc/availability/...`) para validar o histórico.
- **Aceite:** uma estação derrubada do caster aparece como offline (< 2 min) e reduz o uptime; gráfico de 30 dias faz sentido.

## Fase 2 — Modernização do frontend (semanas 4–6)

Objetivo: stack atual e experiência rápida.

- [ ] Upgrade **React 18 → 19** + react-dom (breaking changes pequenas; testes já cobrem os componentes).
- [ ] Upgrade **Vite 5 → 8** (Rolldown) e `@vitejs/plugin-react` 6; vitest 5; jsdom 30.
- [ ] Upgrade **react-leaflet 4 → 5** (compatível com React 19) + Leaflet 1.9.x atual.
- [ ] **Code-splitting** do mapa (react-leaflet é ~40% do bundle de 351 KB) — carregamento sob demanda na primeira troca de aba.
- [ ] **PWA**: manifest + service worker (cache de shell + dados do último estado) para uso em campo sem rede.
- [ ] Lighthouse ≥ 90 em Performance/Acessibilidade/Boas práticas (mobile e desktop).
- **Aceite:** bundle inicial < 250 KB gzip; Lighthouse ≥ 90; zero regressão nos 10 testes de componente.

## Fase 3 — Infraestrutura e observabilidade (semanas 7–8)

Objetivo: operação previsível em produção.

- [ ] **Dockerfile multi-stage** (build do client + runtime Node) + `docker-compose.yml` (API + Redis) para paridade local/produção.
- [ ] Produção com **Redis gerenciado** (ex.: Upstash free tier) — cache e disponibilidade sobrevivem a restarts.
- [ ] **Logs estruturados** (pino) com níveis; substituir os `console.log` dispersos.
- [ ] Backup periódico do `data/availability.json` (o histórico é o ativo mais valioso do projeto).
- [ ] Monitoramento externo (UptimeRobot/Better Stack) apontando para `/api/health`.
- **Aceite:** restart do processo sem perder cache (Redis) nem histórico; logs em JSON.

## Fase 4 — Produto e diferencial (semanas 9–12)

Objetivo: valor além do monitoramento passivo.

- [ ] **Alertas**: notificação (e-mail/webhook/Telegram) quando estação muda de online → offline, com janela configurável.
- [ ] Painel nacional por UF/região com evolução semanal da disponibilidade (dados já existem em `/api/coverage` + tracker).
- [ ] Exportação além de CSV: JSON e GeoJSON (mapa de calor de cobertura em qualquer GIS).
- [ ] Área admin opcional (autenticação simples) para configurar alertas e fontes.
- [ ] Documentação de API pública (OpenAPI/Swagger a partir do `/api/docs` existente).

---

## Métricas de acompanhamento

| Métrica | Hoje | Meta (90 dias) |
|---|---|---|
| Testes automatizados | 55 | 80+ (com E2E Playwright na Fase 2) |
| Uptime real por estação | viesado (só online) | Detecta offline em < 2 min |
| Bundle inicial (gzip) | ~105 KB | < 80 KB com code-splitting |
| Lighthouse mobile | não medido | ≥ 90 |
| Deps desatualizadas (majors) | 9 | 0 |

## Sobre endereços (deploy)

- **Repositório:** https://github.com/ils15/rbmc-ntrip-real-time-monitor
- **GitHub Pages hoje:** NÃO habilitado (`https://ils15.github.io/rbmc-ntrip-real-time-monitor/` → 404).
  Se ativado, esse seria o endereço. Atenção: o Pages só serve arquivos estáticos — este app
  **precisa do backend Express** (proxy NTRIP/IBGE, SSE, CSV). Estratégias possíveis:
  1. Deploy completo no **Render** (já configurado via `render.yaml` — recomendado);
  2. Pages para o frontend + Render só para a API (exige `VITE_API_URL` e CORS ajustado).
- **Render:** serviço `rbmc-monitor` definido em `render.yaml` (verificar conta/implantação ativa).
