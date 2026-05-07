# BerkeleyMapper API

BerkeleyMapper exposes a small same-origin HTTP API used by the browser app. These endpoints can also be called directly from external clients if the deployment allows it.

## Can I Call Spatial Statistics Directly?

Yes. You can call `/api/spatial-statistics` directly without loading the BerkeleyMapper UI first.

The endpoint is stateless. You send grouped point coordinates, BerkeleyMapper runs the polygon intersections on the server, and you poll for the completed result.

```text
your script or app
  -> POST /api/spatial-statistics with grouped points
  -> 202 Accepted with requestId
  -> GET /api/spatial-statistics?id=...
  -> complete result with country/state/county counts
```

You do not need to send a BerkeleyMapper dataset payload or full record rows. For direct use, the important request body is just a `points` array containing `latitude`, `longitude`, and `count`.

## Base URL

Production:

```text
https://berkeleymapper.berkeley.edu
```

Local development with the Node server:

```text
http://127.0.0.1:4173
```

Notes:

- All endpoint paths below are relative to that base URL.
- Direct API use does not require calling the BerkeleyMapper UI first.
- `/api/spatial-statistics` is stateless. You can call it directly as long as the server has access to GADM boundary data.

## Endpoint Summary

- `GET /api/dataset`
- `GET /api/layer`
- `GET /api/gadm41`
- `POST /api/spatial-statistics`
- `GET /api/spatial-statistics?id=...`

## `GET /api/dataset`

Loads a remote tabular data file and optional BerkeleyMapper XML config file, then returns the parsed dataset payload as JSON.

### Query Parameters

- `tabfile` required unless `configfile` is provided.
  Use an absolute HTTP(S) URL or a same-origin path.
  Despite the name, `tabfile` may point to either tab-delimited text or CSV.
- `configfile` optional.
  Use an absolute HTTP(S) URL or a same-origin path to a BerkeleyMapper XML config file.

### Example

```bash
curl -i "https://berkeleymapper.berkeley.edu/api/dataset?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.xml"
```

### Response Shape

Returns parsed dataset JSON including:

- `source`
- `metadata`
- `columns`
- `records`
- `markers`
- `summary`
- `rawConfigText`
- `rawTabPreviewText`

### Behavior

- Supports `GET` and `HEAD`
- Parses TSV and CSV, including quoted CSV fields
- Rejects non-HTTP(S) source URLs
- Returns `400` for missing parameters
- Returns `502` if upstream data cannot be loaded

## `GET /api/layer`

Fetches a remote GIS layer source and returns it with a usable content type.

### Query Parameters

- `url` required.
  Use an absolute HTTP(S) URL or same-origin path to a `.kml`, `.kmz`, `.geojson`, or `.json` resource.

### Example

```bash
curl -i "https://berkeleymapper.berkeley.edu/api/layer?url=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/Anaxyrus_canorus.kmz"
```

### Behavior

- Supports `GET` and `HEAD`
- Infers content type for KML, KMZ, GeoJSON, JSON, and XML sources
- Rejects non-HTTP(S) source URLs
- Returns `400` for missing parameters
- Returns `502` if the upstream layer cannot be loaded

## `GET /api/gadm41`

Returns filtered GADM boundary GeoJSON used by polygon joins and spatial statistics.

### Query Parameters

- `level` required.
  One of `0`, `1`, or `2`
- `country` optional.
  Required for most level `1` and `2` requests unless `countries` is supplied
- `countries` optional.
  Comma-separated country names
- `states` optional.
  Comma-separated state or province names

### Examples

All countries:

```bash
curl -i "https://berkeleymapper.berkeley.edu/api/gadm41?level=0"
```

Counties for one country:

```bash
curl -i "https://berkeleymapper.berkeley.edu/api/gadm41?level=2&country=United%20States"
```

### Behavior

- Supports `GET` and `HEAD`
- Returns GeoJSON
- Requires `GADM41_DIR` to be configured on the server
- Returns `502` if the server cannot read or build the requested boundary data

## `POST /api/spatial-statistics`

Queues a spatial-intersection job for grouped record points. This endpoint can be called directly without loading BerkeleyMapper first.

This is the most useful endpoint to call directly if you already have point coordinates and want BerkeleyMapper’s country, state, and county intersection counts.

### Direct Use

Yes, you can call this endpoint directly from a script, client, or another application.

You do not need to:

- load a BerkeleyMapper page first
- create a BerkeleyMapper dataset payload
- send full records

You only need to send grouped points in this form:

- `latitude`
- `longitude`
- `count`

Grouping repeated coordinates client-side is recommended because it keeps the request body much smaller.

### Request Format

`Content-Type: application/json`

Body:

```json
{
  "points": [
    { "latitude": 37.85, "longitude": -122.27, "count": 1 },
    { "latitude": 37.86, "longitude": -122.28, "count": 2 }
  ]
}
```

Notes:

- `count` means how many records are represented by that coordinate pair
- BerkeleyMapper’s own browser client sends grouped points, not full record rows
- The server also has compatibility support for plain-text CSV request bodies and gzip-compressed request bodies, but plain JSON is the simplest and safest direct-call format
- On `berkeleymapper.berkeley.edu`, plain JSON is the recommended format because Apache/ModSecurity may reject compressed request bodies

### Direct Curl Example

```bash
curl -i https://berkeleymapper.berkeley.edu/api/spatial-statistics \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  --data '{"points":[{"latitude":37.85,"longitude":-122.27,"count":1},{"latitude":37.86,"longitude":-122.28,"count":2}]}'
```

Expected response:

```json
{
  "requestId": "movhfusa-b03dfr",
  "status": "pending",
  "lines": [
    "request received groupedPoints=2",
    "start rawPoints=2 groupedPoints=2"
  ]
}
```

### Response Semantics

- Returns `202 Accepted`
- Returns a `requestId`
- Work continues asynchronously

### Behavior

- Requires the Node server and GADM data at runtime
- Uses level `0`, `1`, and `2` GADM boundaries behind the scenes
- Returns `502` if spatial data is unavailable or the request body cannot be parsed

## `GET /api/spatial-statistics?id=...`

Polls the status of a queued spatial-statistics job.

### Query Parameters

- `id` required.
  The `requestId` returned by `POST /api/spatial-statistics`

### Direct Curl Example

```bash
curl -i "https://berkeleymapper.berkeley.edu/api/spatial-statistics?id=movhfusa-b03dfr"
```

Completed response example:

```json
{
  "requestId": "movhfusa-b03dfr",
  "status": "complete",
  "lines": [
    "request received groupedPoints=2",
    "start rawPoints=2 groupedPoints=2",
    "response ready countryRows=1 stateRows=1 countyRows=1"
  ],
  "error": "",
  "result": {
    "country": [
      {
        "value": "United States",
        "count": 3,
        "recordIds": [],
        "groupIndexes": [0, 1]
      }
    ],
    "state": [
      {
        "value": "California, United States",
        "count": 3,
        "recordIds": [],
        "groupIndexes": [0, 1]
      }
    ],
    "county": [
      {
        "value": "Alameda, California, United States",
        "count": 3,
        "recordIds": [],
        "groupIndexes": [0, 1]
      }
    ]
  }
}
```

### Result Interpretation

- `country`, `state`, and `county` are separate aggregated result sets
- `count` is the sum of all grouped-point counts that intersected that boundary
- `groupIndexes` identify which submitted point groups contributed to the row
- `recordIds` may be empty for direct callers because direct callers typically submit only grouped counts, not BerkeleyMapper-internal record identifiers

## Practical Spatial-Statistics Workflow

If you want to call the spatial-statistics API directly from your own code:

1. Group repeated coordinates client-side.
2. Build a `points` array with `latitude`, `longitude`, and `count`.
3. `POST` that JSON to `/api/spatial-statistics`.
4. Read the returned `requestId`.
5. Poll `/api/spatial-statistics?id=...` until `status` is `complete` or `error`.

Minimal pseudo-flow:

```text
POST /api/spatial-statistics
  -> 202 requestId=abc123

GET /api/spatial-statistics?id=abc123
  -> pending

GET /api/spatial-statistics?id=abc123
  -> complete with country/state/county rows
```

## Deployment Note

These endpoints require the production Node server described in the main README. Serving only the built `dist/` frontend without forwarding `/api/*` to the Node server will not work.
