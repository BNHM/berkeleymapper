# Range Mapping functions in BerkeleyMapper 2.0 #

BerkeleyMapper 2.0 serves KML files based on spatial layers from IUCN for amphibians, birds, and mammals.

# Details #

(NOTE! for all of the following examples, use http://berkeleymappertest.berkeley.edu/ instead of http://berkeleymapper.berkeley.edu/ until v2 BM goes live.  This is expected to happen sometime in April or May, 2012.

The following examples show what to put in the CDATA section of each layer element (see example below):

**Amphibian Example**

http://berkeleymapper.berkeley.edu/v2/speciesrange/Plethodon+montanus/binomial/gaa_2011

**Mammal Example**

http://berkeleymapper.berkeley.edu/v2/speciesrange/Lynx+rufus/sci_name/mamm_2009

**Birds Example**

http://berkeleymapper.berkeley.edu/v2/speciesrange/Aburria+aburri/sci_name/birds_2009

An example of inserting calls to these services in the BerkeleyMapper configuration file:
```xml

<gisdata>

<layer title="Lynx rufus" name="mamm" location="Lynx rufus" legend="1" active="1" url=""><![CDATA[http://berkeleymappertest.berkeley.edu/v2/speciesrange/Lynx+rufus/sci_name/mamm_2009]]>

Unknown end tag for &lt;/layer&gt;





Unknown end tag for &lt;/gisdata&gt;


```