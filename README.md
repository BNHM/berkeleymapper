<img src='https://raw.githubusercontent.com/BNHM/berkeleymapper/master/src/main/webapp/img/logo_medium.png' width='150' align="left">

## Introduction
BerkeleyMapper 2.0 is a mapping interface for Collections (or other) Databases built on top of Google Maps.  Users can configure their mapping interface through a simple XML configuration script while mapping data from tab-delimited text files.

This codebase is in active development, with many new features and interface changes from the prior version.  The BerkeleyMapper instance running at http://berkeleymapper.berkeley.edu is open to anyone mapping natural history collections data.  The code is open source, so you may wish to setup your own instance running on another server. If you have any questions or feature requests please email the developer at "jdeck -at- berkeley -dot- edu"

Instructions for using BerkeleyMapper are found in the <a href='https://github.com/jdeck88/berkeleymapper/wiki'>wiki</a>

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

# source ~/.bashrc
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

