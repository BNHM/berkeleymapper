<img src='https://raw.githubusercontent.com/BNHM/berkeleymapper/master/public/logo_medium.png' width='150' align="left">

## Introduction
BerkeleyMapper 2.0 is a React + Leaflet mapping interface for collections and other tabular geographic datasets. It keeps compatibility with the BerkeleyMapper XML config format while rendering records, layers, and UI behavior in JavaScript.

Point datasets can now be supplied as either tab-delimited text or CSV, including standard quoted CSV fields.

Instructions for using BerkeleyMapper are found in the <a href='https://github.com/jdeck88/berkeleymapper/wiki'>wiki</a>

## Try it out!
Sample Arctos call:

http://berkeleymapper.berkeley.edu/index.html?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.xml

Sample AmphibiaWeb call:

http://berkeleymapper.berkeley.edu/index.html?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/public/sampledata/amphibiaweb.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/public/sampledata/amphibiaweb.xml

## Application
The app runs as a JavaScript frontend with a small Node server for same-origin proxy endpoints.

Local development:

```bash
nvm use
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Preview the built app locally:

```bash
npm run preview
```

The current React app supports:

- load a tab-delimited or CSV dataset directly in the browser from a URL
- optionally load a legacy BerkeleyMapper XML config directly in the browser
- parse records and coordinates in JavaScript
- render the dataset in a React UI with a Leaflet map and records table
- render collection logos and metadata from config
- support config-driven field ordering, aliases, and visible-field filtering
- support config-driven marker coloring
- load KML, KMZ, and GeoJSON overlay layers from `gisdata.layer`
- toggle and zoom to overlay layers from the legend
- proxy remote dataset/config/layer requests through same-origin API endpoints

## Deployment
The frontend builds to static assets in `dist/`, but the application is not a pure static site once you use same-origin API features.

- client routes are static assets built by Vite
- the production Node server exposes `/api/dataset`, `/api/layer`, `/api/gadm41`, and `/api/spatial-statistics`
- remote dataset hosts no longer need browser CORS headers when accessed through that server endpoint
- spatial statistics depends on the Node server and GADM data being available at runtime
- serving only `dist/` from Apache, nginx, Netlify, or similar without forwarding `/api/*` to the Node server will cause API requests to fall through to `index.html`

Build settings:

```bash
Build command: npm run build
Publish directory: dist
```

Production process:

```bash
./restart.sh
```

That script rebuilds the frontend and runs `server/static-server.mjs` under PM2.

## API Endpoints
Detailed endpoint documentation, request formats, and direct-call examples are in [API.md](API.md).

That document includes:

- request and response structure for each endpoint
- curl examples
- direct use of `/api/spatial-statistics` without loading BerkeleyMapper itself
- request-shaping guidance for grouped point statistics calls

## Config Support
Current config support is tracked in [docs/config-file-support.md](/Users/jdeck/IdeaProjects/berkeleymapper/berkeleymapper/docs/config-file-support.md).

Supported areas currently include:
- metadata and logos
- concepts, field aliases, ordering, and visible columns
- record linkback generation
- GIS layer metadata and overlay loading

## Roadmap
Areas still being improved in the JavaScript app include:

- polygon and spatial intersection processing
- shapefile-backed spatial lookups
- the remaining config-driven feature surface and older workflow variants
