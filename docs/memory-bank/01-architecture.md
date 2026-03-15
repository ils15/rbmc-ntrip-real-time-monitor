# 01 - Architecture

## High-level
- Node/Express backend serves station endpoints.
- React frontend consumes `/api/stations-ibge` and fallback `/api/stations`.
- Leaflet renders map markers and station popups.

## Data Flow
1. Frontend requests station payload.
2. Backend resolves cache, then NTRIP as primary source, IBGE as fallback.
3. Frontend normalizes station schema and renders map/list.

## Key Decisions
- NTRIP-first strategy for broad real-time station coverage.
- IBGE retained as fallback/reference source.
- Theme-dependent tile layers for readability.
