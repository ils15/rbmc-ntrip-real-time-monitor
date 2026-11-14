# rbmc-ntrip-real-time-monitor

Dashboard do status das estações GNSS da RBMC (Rede Brasileira de Monitoramento Contínuo dos Sistemas GNSS), com dados de NTRIP Caster e da API RBMC do IBGE.

[![CI](https://github.com/ils15/rbmc-ntrip-real-time-monitor/actions/workflows/nodejs.yml/badge.svg)](https://github.com/ils15/rbmc-ntrip-real-time-monitor/actions/workflows/nodejs.yml)
[![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-green)](LICENSE)
![Node](https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)

## O que é

Servidor Express que faz proxy e cache das fontes (NTRIP Caster, API RBMC do IBGE) e um cliente React + Vite que consome essa API.

- Mapa (Leaflet) e lista das estações RBMC, com busca e filtro por status
- Atualização em tempo real via SSE em `/api/events`
- KPIs de total de estações, online/offline e estado da fonte de dados
- Disponibilidade por estação e cobertura agregada
- Exportação CSV de estações e de disponibilidade
- Relatórios oficiais (PDF), arquivos RINEX 2/3 e órbitas via API RBMC do IBGE
- Interface em português e inglês, tema claro/escuro
- Documentação da API servida em `/api/docs`

Capturas de tela: [docs/capturas.md](docs/capturas.md).

## Instalação

Requer Node 22 (`.nvmrc`; `engines` aceita a partir do 18).

```bash
npm install
cd client && npm install && cd ..
cp .env.example .env
```

Variáveis principais em `.env`: `PORT`, `NTRIP_CASTER_URL`, `CORS_ALLOWED_ORIGINS`, `CACHE_TTL_MS`, `IBGE_CACHE_TTL`, `STATION_REFRESH_MS` e `REDIS_URL` (opcional, cache compartilhado).

## Uso

```bash
npm run dev:all     # servidor + cliente em paralelo
npm start           # apenas o servidor (server.js)
npm run dev         # servidor com --watch
npm run dev:client  # apenas o cliente (Vite)
npm run build:client
npm test            # testes do backend (node --test)
npm run test:all    # backend + cliente (vitest)
```

Cliente em `http://localhost:5173`; o Vite faz proxy de `/api` para `http://localhost:3001`.

Em produção o Express serve a API e o build do cliente a partir de `client/dist` (ver `render.yaml`). O workflow `deploy-pages.yml` publica apenas o frontend estático no GitHub Pages, usando `VITE_API_URL` (padrão `https://rbmc-monitor.onrender.com`) para alcançar a API em outra origem.

## Estrutura

```
server.js        # Express: rotas, SSE, cache, export CSV
src/             # cliente NTRIP, cliente IBGE, disponibilidade, CSV
client/src/      # SPA React (componentes, hooks, i18n, tema)
test/            # testes do backend (node --test)
docs/            # capturas e memory bank
```

## Licença

MIT — veja [LICENSE](LICENSE).
