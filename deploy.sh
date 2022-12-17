# instructions for development and deployment which is done on the command-line
# first make sure we add localhost referrer in:
# https://console.cloud.google.com/apis/credentials?project=berkeleymapper
# add the following:
# http://localhost:8080/*
# make sure you disable this when done developing

# build the war file
./gradlew war
# copy it into place on this machine
cp dist/berkeleymapper.war /usr/local/Cellar/jetty/9.4.42.v20210604/libexec/webapps/root.war
# open a test page
#/usr/bin/open -a "/Applications/Google Chrome.app" 'http://localhost:8080/index.html?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/awtest.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/awtest.xml'


# on deployment server
#sudo -u jetty cp dist/berkeleymapper.war /usr/share/jetty9/webapps/root-berkeleymappertest.berkeley.edu.war
