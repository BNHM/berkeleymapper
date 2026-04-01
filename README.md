<img src='https://raw.githubusercontent.com/BNHM/berkeleymapper/master/src/main/webapp/img/logo_medium.png' width='150' align="left">

## Introduction
BerkeleyMapper 2.0 is a mapping interface for collections and other tabular geographic datasets. Users configure the map through a legacy BerkeleyMapper XML config file and map records from tab-delimited text files.

The current codebase is a React + Leaflet refactor of the older Java/Google Maps application. It keeps compatibility with the BerkeleyMapper config format while moving loading, rendering, and UI behavior into JavaScript.

Instructions for using BerkeleyMapper are found in the <a href='https://github.com/jdeck88/berkeleymapper/wiki'>wiki</a>

## Try it out!
Sample Arctos call:

http://berkeleymapper.berkeley.edu/index.html?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.xml

Sample AmphibiaWeb call:

http://berkeleymapper.berkeley.edu/index.html?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/public/sampledata/amphibiaweb.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/public/sampledata/amphibiaweb.xml

## JavaScript Refactor
The current app runs as a JavaScript frontend with a small Node server for same-origin proxy endpoints.

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

- load a tab-delimited dataset directly in the browser from a URL
- optionally load a legacy BerkeleyMapper XML config directly in the browser
- parse records and coordinates in JavaScript
- render the dataset in a React UI with a Leaflet map and records table
- render collection logos and metadata from config
- support config-driven field ordering, aliases, and visible-field filtering
- support config-driven marker coloring
- load KML, KMZ, and GeoJSON overlay layers from `gisdata.layer`
- toggle and zoom to overlay layers from the legend
- proxy remote dataset/config/layer requests through same-origin API endpoints

## Static Deployment
The app now builds to a static site and can be hosted anywhere that can serve the `dist/` directory.

- client routes are static assets built by Vite
- the production Node server exposes `/api/dataset` and `/api/layer`
- remote dataset hosts no longer need browser CORS headers when accessed through that server endpoint

Build settings:

```bash
Build command: npm run build
Publish directory: dist
```

## API Endpoints
The JavaScript app currently uses two same-origin endpoints.

### `GET /api/dataset`
Loads a remote tabfile and optional config file server-side, then returns the parsed BerkeleyMapper dataset payload as JSON.

Query parameters:
- `tabfile` required, absolute or same-origin URL to a tab-delimited text file
- `configfile` optional, absolute or same-origin URL to a BerkeleyMapper XML config file

Example:

```text
/api/dataset?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.xml
```

Behavior:
- supports `GET` and `HEAD`
- rejects non-HTTP(S) URLs
- returns `400` for missing required parameters
- returns `502` when upstream data cannot be loaded

### `GET /api/layer`
Fetches a remote overlay source server-side and returns it to the browser with the appropriate content type.

Query parameters:
- `url` required, absolute or same-origin URL to a `.kml`, `.kmz`, `.geojson`, or `.json` layer source

Example:

```text
/api/layer?url=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/Anaxyrus_canorus.kmz
```

Behavior:
- supports `GET` and `HEAD`
- infers content type for KML, KMZ, GeoJSON, JSON, and XML sources
- rejects non-HTTP(S) URLs
- returns `400` for missing required parameters
- returns `502` when upstream layer content cannot be loaded
- detects common human-verification HTML pages and treats them as errors instead of valid layer data

## Config Support
Current config support is tracked in [docs/config-file-support.md](/Users/jdeck/IdeaProjects/berkeleymapper/berkeleymapper/docs/config-file-support.md).

Supported areas currently include:
- metadata and logos
- concepts, field aliases, ordering, and visible columns
- record linkback generation
- GIS layer metadata and overlay loading

## Remaining Legacy Work
Some features are still legacy Java behavior and need to be ported separately:

- polygon and spatial intersection processing
- shapefile-backed spatial lookups
- the remaining config-driven feature surface and older workflow variants

## Developers
The legacy Java/WAR deployment files are still present for older deployment paths. If you need the older Gradle/WAR flow:

```
# java libraries built around java 8, to use java 8, use the following:
# (https://stackoverflow.com/questions/52524112/how-do-i-install-java-on-mac-osx-allowing-version-switching/52524114#52524114)
# (https://sdkman.io/install)
sdk use java 8.0.352-amzn
sdk use gradle 4.10.1
git clone {this_repo}
# install gradle if you have not done so, then...
gradle build

# source ~/.profile
deployBerkeleymapper
```         

The gradle build process will create a WAR file called `dist/berkeleymapper.war`

In the `src/main/resources/` directory, copy `config.properties.template` to `config.props` and enter the setting `filesLocation = /path/to/temp/directory/` to point to the directory you want temporary files stored.

Certain connections require importing certificate to allow 3rd party access:
First, obtain an exported copy of certificate. (On chrome, developer tools->security)
Second, import into keystore using the keytool program
```
keytool -import -alias example -keystore /etc/ssl/certs/java/cacerts -file {FILEAME}
```
Note that cert files are stored in ~jdeck/certs
