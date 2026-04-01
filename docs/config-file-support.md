# BerkeleyMapper Config Support

Source specification:
- https://github.com/BNHM/berkeleymapper/wiki/Configuration-File-Specification

This file tracks what the JavaScript refactor currently supports from the legacy BerkeleyMapper configuration format and where that behavior lives in code.

## Supported

### Metadata
- `metadata.legendText`
- `metadata.abstract`
- `metadata.disclaimer`
- `metadata.logo`
- top-level `logo`
- top-level `logos.logo`
- legacy root tags `berkeleymapper`, `bnhmmaps`, and other single-root legacy variants

Implementation:
- parser: `server/lib/parseLegacyConfig.js`
- UI: `client/App.jsx`

### Concepts
- `concept.alias`
- `concept.datatype`
- `concept.order`
- `concept.viewlist`
- `concept.colorlist`

Implementation:
- parser: `server/lib/parseLegacyConfig.js`
- ordering, visible-field filtering, colorable-field extraction: `server/lib/parseTabularData.js`
- UI consumption: `client/App.jsx`

Behavior:
- `order` controls rendered record column order
- `viewlist="0"` hides the field from results and popups
- `colorlist="1"` exposes the field in the `Color By` UI and drives Leaflet marker recoloring

### Record LinkBack
- fully formatted links already present in tab data
- config-driven `<recordlinkback><linkback ... /></recordlinkback>`
- legacy config-driven standalone `<linkback ... />`
- legacy metadata-scoped `<metadata><linkback ... /></metadata>`
- methods:
  - `pattern`
  - `root`
  - `entireurl`
  - `none`

Implementation:
- parser: `server/lib/parseLegacyConfig.js`
- record value synthesis: `server/lib/parseTabularData.js`
- link rendering: `client/App.jsx`

### GIS Data
- `gisdata.layer`
- `title`
- `legend`
- `active`
- `url`
- CDATA layer location

Implementation:
- parser: `server/lib/parseLegacyConfig.js`
- UI listing: `client/App.jsx`

## Not Yet Implemented

### Download-time disclaimer workflow
- disclaimer text is parsed
- dedicated download workflow and download confirmation UI are not yet ported

### Legacy KML layer overlay behavior
- KML, KMZ, and GeoJSON layer metadata is parsed
- remote layers are fetched through the same-origin `/api/layer` proxy
- sidebar controls can toggle visibility and zoom to loaded overlays
