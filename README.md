<img src='https://raw.githubusercontent.com/BNHM/berkeleymapper/master/src/main/webapp/img/logo_medium.png' width='150' align="left">

## Introduction
BerkeleyMapper 2.0 is a mapping interface for Collections (or other) Databases built on top of Google Maps.  Users can configure their mapping interface through a simple XML configuration script while mapping data from tab-delimited text files.

This codebase is in active development, with many new features and interface changes from the prior version.  The BerkeleyMapper instance running at http://berkeleymapper.berkeley.edu is open to anyone mapping natural history collections data.  The code is open source, so you may wish to setup your own instance running on another server. If you have any questions or feature requests please email the developer at "jdeck -at- berkeley -dot- edu"

Instructions for using BerkeleyMapper are found in the <a href='https://github.com/jdeck88/berkeleymapper/wiki'>wiki</a>

## Try it out!
Following shows a sample berkeleymapper call from Arctos

http://berkeleymapper.berkeley.edu/index.html?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.xml

## JavaScript Refactor
The `refactor` branch now includes a JavaScript runtime that replaces the WAR-based startup path with:

```bash
nvm use
npm install
npm start
```

Local development now runs through Vite only. The `/api/load` and `/api/health` endpoints are served locally by the same shared handlers that Netlify Functions use in production, so the request flow is the same in both environments.

This React + Node slice currently ports the first part of BerkeleyMapper away from Java:

- load a tab-delimited dataset from a URL or inline POST payload
- optionally load a legacy BerkeleyMapper XML config
- parse data in a stateless request flow with no temp-file writes
- parse records and coordinates in JavaScript
- render the dataset in a React UI with a Leaflet map and records table

## Netlify Deployment
The app now works with Netlify’s static hosting plus Functions without server-side file writes or persistent session storage.

- client routes are static assets built by Vite
- `/api/load` is redirected to a Netlify Function
- the function fetches remote `tabfile` and `configfile` URLs, parses them in memory, and returns the dataset payload directly
- inline `tabdata` and `configdata` POST bodies also work, so demo/sample loads do not depend on any writable server filesystem

Build settings:

```bash
Build command: npm run build
Publish directory: dist
```

Netlify config lives in `netlify.toml`.

The remaining Java-only REST features are still legacy code for now and need to be ported separately:

- polygon and spatial intersection processing
- downloads and KML export
- shapefile-backed spatial lookups
- the rest of the config-driven feature surface

## Developers
All external libraries are controlled by gradle, so to get started, you need to just:

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
