# Earthquake Visualizer

Interactive map to explore recent earthquakes from the USGS GeoJSON feeds.
<img width="1902" height="905" alt="image" src="https://github.com/user-attachments/assets/d021646e-e8c9-45b8-8100-b408e310a6dd" />

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS + shadcn/ui (Radix primitives)
- Leaflet + react-leaflet + clustering
- USGS Earthquake GeoJSON feeds

## Features

- Time range filters: past hour/day/week/month
- Min magnitude and place text search
- Earthquakes rendered as scalable, depth-colored circle markers
- Marker clustering and auto-fit to results
- Desktop list panel (paginated, newest first) synced with map selection
- Details popup (Leaflet) and optional modal (from list)
- Dark/Light themes, persistent via localStorage
- Loading, empty state, and error toast notifications

## Quick Start

```bash
# 1) Install deps
npm install

# 2) Start dev server
npm run dev

# 3) Build for production
npm run build
npm run preview
```

Requirements:
- Node 18+ recommended

## Configuration

No API keys are required. Feeds used:
- Hour: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson
- Day: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson
- Week: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson
- Month: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson


## High-level Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                               App (React)                            │
│                                                                      │
│  Header: title, theme toggle, mobile filter sheet trigger            │
│  ─────────────────────────────────────────────────────────────────   │
│  Layout:                                                             │
│  • Sidebar (md+): time range, min magnitude, place query             │
│  • Map (react-leaflet):                                              │
│    - TileLayer (CARTO light/dark)                                     │
│    - MarkerClusterGroup                                               │
│    - CircleMarker (size=mag, color=depth) + Popup                     │
│    - FitBounds + selection-aware flyTo                                │
│  • Right Panel (md+): paginated list (9/page), selection sync        │
│                                                                      │
│  Data Flow:                                                           │
│  usgs.ts (fetchEarthquakes range) → state → filtered/sorted → map+UI │
│                                                                      │
│  UI Toolkit: Tailwind + shadcn/ui (Sheet, Dialog, Toast, Inputs)      │
└──────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

- Client-side filtering for min magnitude and place; keeping API calls simple.
- Clustering to keep the map performant/legible at low zoom levels.
- Depth-driven marker color: shallow (green) → intermediate (amber) → deep (red).
- Automatic fit-to-bounds on dataset change; disabled when user selects an event to prevent view “snap back”.
- Theme swaps tile provider (CARTO light/dark) to keep map consistent with UI.

## Accessibility & UX

- Keyboard focusable list items and controls
- Clear focus states from shadcn/ui + Tailwind
- High-contrast dark/light tiles and UI tokens

## Testing & QA Checklist

- Filters: hour/day/week/month; extreme magnitudes; place query
- Clustered regions (California, Japan, Alaska) at various zooms
- Theme toggle persistence
- Pagination (9 per page) navigation across results
- Network errors (simulate offline): shows destructive toast, no crash
- Mobile: filter sheet, full-screen map layout

## Project Scripts

- `npm run dev` – start Vite dev server
- `npm run build` – typecheck + build
- `npm run preview` – preview production build

## Folder Structure (excerpt)

```text
src/
  components/ui/    # shadcn/ui components
  lib/usgs.ts       # data fetcher
  types/earthquake.ts
  App.tsx           # layout, map, list, filters
  main.tsx          # app entry, Leaflet CSS, Toaster
```

## License

MIT

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
