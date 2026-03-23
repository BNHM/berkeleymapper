<img src='https://raw.githubusercontent.com/BNHM/berkeleymapper/master/src/main/webapp/img/logo_medium.png' width='150' align="left">

## Introduction
BerkeleyMapper 2.0 is a mapping interface for Collections (or other) Databases built on top of Google Maps.  Users can configure their mapping interface through a simple XML configuration script while mapping data from tab-delimited text files.

This codebase is in active development, with many new features and interface changes from the prior version.  The BerkeleyMapper instance running at http://berkeleymapper.berkeley.edu is open to anyone mapping natural history collections data.  The code is open source, so you may wish to setup your own instance running on another server. If you have any questions or feature requests please email the developer at "jdeck -at- berkeley -dot- edu"

Instructions for using BerkeleyMapper are found in the <a href='https://github.com/jdeck88/berkeleymapper/wiki'>wiki</a>

## Try it out!
Following shows a sample berkeleymapper call from Arctos

http://berkeleymapper.berkeley.edu/index.html?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.xml

## JavaScript Refactor
The current refactor branch now includes a JavaScript runtime that replaces the WAR-based startup path with:

```bash
nvm use
npm install
npm start
```

Local development runs through Vite only, and production output is a static site build.

This React slice currently ports the first part of BerkeleyMapper away from Java:

- load a tab-delimited dataset directly in the browser from a URL
- optionally load a legacy BerkeleyMapper XML config directly in the browser
- parse records and coordinates in JavaScript
- render the dataset in a React UI with a Leaflet map and records table

## Static Deployment
The app now builds to a static site and can be hosted anywhere that can serve the `dist/` directory.

- client routes are static assets built by Vite
- dataset loading happens in the user's browser
- remote `tabfile` and `configfile` hosts must support CORS for browser loading to work

Build settings:

```bash
Build command: npm run build
Publish directory: dist
```

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
