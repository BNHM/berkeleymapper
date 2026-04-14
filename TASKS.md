## Boundary Data Plan

### Recommended Storage Paths

- Local development authoritative boundary store: `./var/boundaries/`
- Production authoritative boundary store: `/srv/berkeleymapper-data/boundaries/`
- Configuration knob for both: `BOUNDARY_DATA_DIR`

Use the same internal layout under both roots so scripts and config stay portable:

```text
${BOUNDARY_DATA_DIR}/
  source/
    gadm/
      usa/
        gadm41_USA.gpkg
      world/
        gadm_410-levels.gpkg
    census/
      usa/
        cb_2024_us_county_500k.gpkg
  derived/
    geojson/
      usa/
        counties_simplified.geojson
    shapefile/
      usa/
        counties/
          counties.shp
          counties.shx
          counties.dbf
          counties.prj
  cache/
  manifests/
```

### Format Recommendation

- Source of truth: `GeoPackage (.gpkg)`
- Display layer format: `GeoJSON`
- Legacy Java intersection fallback: `Shapefile`

Why:

- `GeoPackage` is the best authoring and storage format for boundary data. It is a single file, cleaner than shapefile sidecar sets, and works well with GADM, QGIS, GDAL, and PostGIS import workflows.
- `GeoJSON` is the best format for BerkeleyMapper online display because the current app loads remote `GeoJSON`, `KML`, and `KMZ` directly.
- `Shapefile` should only be kept as a derived export for the old Java spatial-intersection code, because that code currently reads shapefiles from disk.

### Practical Rule

- Do not store the full production admin-boundary corpus in git.
- Keep only:
  - scripts
  - manifests
  - small fixtures
  - tiny test datasets
- Keep real downloaded boundary files under `BOUNDARY_DATA_DIR`, outside normal source control.

### Recommended Data Sources

- Global admin boundaries: `GADM` as GeoPackage
- US states/counties: `US Census Cartographic Boundary Files`
- Remote display-only option: `geoBoundaries` simplified GeoJSON

### BerkeleyMapper-Specific Guidance

- Current React app:
  - use remote or proxied `GeoJSON` for display layers
- Legacy Java spatial intersection:
  - use a local shapefile export derived from the authoritative `GeoPackage`
- Preferred future direction:
  - move spatial intersection into the Node server
  - use derived local `GeoJSON` as the Node runtime format

### Implementation Tasks

1. Add `BOUNDARY_DATA_DIR` support for local and server deployments.
2. Add a download/build script:
   - `scripts/fetch-boundaries.sh`
3. Add a derivation script:
   - export simplified `GeoJSON` for display
   - export `Shapefile` for legacy spatial intersections
4. Add `.gitignore` entries for:
   - `var/boundaries/`
   - other local boundary cache directories
5. Keep only small sample boundary fixtures in-repo for tests and examples.
6. Add a Node spatial-intersection endpoint.
7. Load derived boundary `GeoJSON` in the Node process and cache it in memory.
8. Add bbox or spatial indexing before point-in-polygon checks.
9. Use Node runtime boundaries for:
   - point-in-polygon statistics
   - county/state/admin joins where polygon containment is preferred over centroid lookup

### Suggested Default

If only one authoritative dataset is chosen:

- Use `GeoPackage` under `${BOUNDARY_DATA_DIR}/source/...`
- Derive:
  - `GeoJSON` for map display
  - `Shapefile` only where the legacy intersection code still requires it

### Node Intersection Recommendation

- Yes, spatial intersection should be implemented in Node for this codebase.
- Recommended runtime path:
  - authoritative source on disk: `GeoPackage`
  - derived runtime format for Node: `GeoJSON`
  - optional legacy compatibility export: `Shapefile`

This is the practical split:

- `GeoPackage` is best for storage and update workflows.
- `GeoJSON` is best for the current BerkeleyMapper JavaScript stack and can support both display and server-side intersection.
- `Shapefile` should be treated as a compatibility artifact, not the primary storage format.

### Scale Guidance

- US counties/states or single-country ADM1/ADM2:
  - Node intersection is practical
- Large global admin datasets:
  - Node can still work with indexing and simplification
  - move to `PostGIS` if dataset size or query volume grows
