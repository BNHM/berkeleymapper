BerkeleyMapper 2.0 is a mapping interface for Collections (or other) Databases built on top of Google Maps.  Users can configure their mapping interface through a simple XML configuration script, mapping data from tab-delimited text files.

This codebase is in active development, with many new features and interface changes from the prior version.  BerkeleyMapper 1.0 calls will be automatically converted to BerkeleyMapper 2.0.  If you have any questions or feature requests please email the developer at "jdeck -at- berkeley -dot- edu"

<img src='http://berkeleymapper.googlecode.com/files/mapping.jpg' width='400'>

Step by step guide to building a BerkeleyMapper 2.0 configuration using a SampleConfiguration.<br>
<br>
<b>Test BerkeleyMapper 2.0</b>
<ul><li><a href='http://berkeleymappertest.berkeley.edu/index.html?ViewResults=tab&tabfile=http://berkeleymappertest.berkeley.edu/schemas/pointverify.txt&configfile=http://berkeleymappertest.berkeley.edu/schemas/pointverify.xml'>http://berkeleymappertest.berkeley.edu/index.html?ViewResults=tab&amp;tabfile=http://berkeleymappertest.berkeley.edu/schemas/pointverify.txt&amp;configfile=http://berkeleymappertest.berkeley.edu/schemas/pointverify.xml</a> Run TEST 1 (Map a set of points)]<br>
</li><li><a href='http://berkeleymappertest.berkeley.edu/index.html?tabfile=http://berkeleymappertest.berkeley.edu/schemas/arctos.txt&configfile=http://berkeleymappertest.berkeley.edu/schemas/arctos.xml'>http://berkeleymappertest.berkeley.edu/index.html?tabfile=http://berkeleymappertest.berkeley.edu/schemas/arctos.txt&amp;configfile=http://berkeleymappertest.berkeley.edu/schemas/arctos.xml</a> Run TEST 2 (Point mapping with a range map)]</li></ul>

<b>Testing During the Transition Phase</b>

Change your BerkeleyMapper 1.0 Call to use the BerkeleyMapper 2.0 Test server, for example:<br>
<a href='http://berkeleymapper.berkeley.edu/'>http://berkeleymapper.berkeley.edu/</a>....<br>
becomes ...<br>
<a href='http://berkeleymappertest.berkeley.edu/'>http://berkeleymappertest.berkeley.edu/</a>...<br>
<br>
More details and information is available at the <a href='http://code.google.com/p/berkeleymapper/w/list'>Wiki</a>