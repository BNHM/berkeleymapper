# instructions for development and deployment which is done on the command-line
# first make sure we add localhost referrer in:
# https://console.cloud.google.com/apis/credentials?project=berkeleymapper
# add the following:
# http://localhost:8080/*
# make sure you disable this when done developing

# build the war file
./gradlew war
# copy it into place on this machine
cp dist/berkeleymapper.war /usr/local/Cellar/jetty/9.4.50.v20221201/libexec/webapps/root.war

# Also, from deploying in Jetty... the server configuration does not properly deploy
# from within Intellij so i want to follow the above every time i change code and redeploy!!

# open a test page
#/usr/bin/open -a "/Applications/Google Chrome.app" 'http://localhost:8080/index.html?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/awtest.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/awtest.xml'
#/usr/bin/open -a "/Applications/Google Chrome.app" 'http://localhost:8080/index.html?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.txt&configfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.xml'


# on deployment server
#sudo -u jetty cp dist/berkeleymapper.war /usr/share/jetty9/webapps/root-berkeleymappertest.berkeley.edu.war
