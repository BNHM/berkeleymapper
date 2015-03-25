

# Introduction #

This file is specified in the calling URL by setting configfile=<some location>.  You may put this file on any URL.  Please validate your XML before putting a configfile into place and testing it.  If you have any questions you may contact the administrator for assistance.

# A Note on Special Characters #
<p>Since data is passed using XML documents, embedded in databases, and sometimes coming from text documents, care should be taken in using special characters.  It is reccomended to use the named entity references (see, for example <a href='http://home.earthlink.net/~bobbau/platforms/specialchars/'><a href='http://home.earthlink.net/~bobbau/platforms/specialchars/'>http://home.earthlink.net/~bobbau/platforms/specialchars/</a></a>).  In addition, any & symbol should be entered as a named reference, even when used in identify named references.<br>
<br>
<h1>Opening Tag</h1>
<code>&lt;berkeleymapper&gt;</code>

<h1>Metadata Section</h1>
<code>&lt;metadata</code>

<p>

<table><thead><th><b>Element:</b></th><th><pre><mapwiki></pre></th></thead><tbody>
<tr><td><b>Attributes:</b></td><td>organization,email</td></tr>
<tr><td><b>Repeatable:</b></td><td>No</td></tr>
<tr><td><b>Example:</b></td><td><pre><mapwiki organization="Museum of Vertebrate Zoology" email="fredflintstone@aol.com" /></pre></td></tr>
<tr><td><b>Description:</b></td><td>Instruct mapwiki calls to fill in default organization and email.</td></tr></tbody></table>

<p>

<table><thead><th><b>Element:</b></th><th><pre><abstract></pre></th></thead><tbody>
<tr><td><b>Attributes:</b></td><td>None</td></tr>
<tr><td><b>Repeatable:</b></td><td>No</td></tr>
<tr><td><b>Example:</b></td><td><pre><abstract>GIS configuration file for MVZ query interface<br>
<br>
Unknown end tag for </abstract><br>
<br>
</pre></td></tr>
<tr><td><b>Description:</b></td><td>A more in-depth description of what the purpose of this application does for the group.</td></tr></tbody></table>

<p>

<table><thead><th><b>Element:</b></th><th><pre><mapkeyword></pre></th></thead><tbody>
<tr><td><b>Attributes:</b></td><td>keyword</td></tr>
<tr><td><b>Repeatable:</b></td><td>No</td></tr>
<tr><td><b>Example:</b></td><td><pre><mapkeyword keyword="specimens"><br>
<br>
Unknown end tag for </mapkeyword><br>
<br>
</pre></td></tr>
<tr><td><b>Description:</b></td><td>This specifies what we are mapping.  By default is specimens but if you put another word here, it will refer to the points as this word.</td></tr></tbody></table>

<p>

<table><thead><th><b>Element:</b></th><th><pre><disclaimer></pre></th></thead><tbody>
<tr><td><b>Attributes:</b></td><td>  </td></tr>
<tr><td><b>Repeatable:</b></td><td>No</td></tr>
<tr><td><b>Example:</b></td><td><pre><disclaimer><![CDATA[Data records provided by ORNIS may be used by individual researchers or research groups, but they may not be repackaged, resold, or redistributed in any form without the express written consent of the original institution where those records are held.<p>Citations: ....(etc)]]><br>
<br>
Unknown end tag for </disclaimer><br>
<br>
</pre></td></tr>
<tr><td><b>Description:</b></td><td>This is a user-supplied disclaimer to display when users are downloading data.  Make sure you use the CDATA syntax if you include HTML tags here.</td></tr></tbody></table>

<p>

<table><thead><th><b>Element:</b></th><th><pre><logo></pre></th></thead><tbody>
<tr><td><b>Attributes:</b></td><td>img,url</td></tr>
<tr><td><b>Repeatable:</b></td><td>Yes</td></tr>
<tr><td><b>Example:</b></td><td><pre><logo img="http://moorea.berkeley.edu/sites/default/files/u4/gumpzen2_logo.gif" url="http://moorea.berkeley.edu/" /></pre></td></tr>
<tr><td><b>Description:</b></td><td>These tags will display logos and a link in the legend.</td></tr></tbody></table>

<p>
<code>&lt;/metadata&gt;</code>

<h1>Record LinkBack</h1>
<p>
There are two methods for record linkbacks in BerkeleyMapper 2.0.<br>
<p>
1. Fully formatted from the calling application with the link placed in the tab delimited text as its own field (or part of another field, such as):<br>
<p>
<code>&lt;a href="someurl"&gt;12345&lt;/a&gt;</code>
<p>
2. Specified in  the linkback URL syntax with:<br>
<br>
<table><thead><th><b>method:</b></th><th>how to linkback</th></thead><tbody>
<tr><td><b>linkurl:</b></td><td>url to use</td></tr>
<tr><td><b>text:</b></td><td>text to display inside href tag</td></tr>
<tr><td><b>fieldname:</b></td><td>name of field</td></tr>
<tr><td><b>key1:</b></td><td>Concept Alias</td></tr>
<tr><td><b>value1:</b></td><td>Concept Name</td></tr></tbody></table>

<pre><code>&lt;recordlinkback&gt;<br>
&lt;linkback method="root" linkurl="http://biocode.berkeley.edu/cgi/biocode_query?one=T" text="View Details" fieldname="Link Back" key1="bnhm_id" value1="char120_5"/&gt;<br>
&lt;/recordlinkback&gt;<br>
</code></pre>

<h1>Matching tab-delimited fields to Map schema</h1>
<code>&lt;concepts xmlns:darwin="http://digir.net/schema/conceptual/darwin/2003/1.0"&gt;</code>
<p>

<table><thead><th><b>Element:</b></th><th>

<concept>

</th></thead><tbody>
<tr><td><b>Attributes:</b></td><td><i>viewlist</i>: 0 means do not show this field in query results.  1 means to show it.<br><i>colorlist</i>: 0 means do not add this as an option under 'Color By'.  1 means add this as an option to 'Color By', so the user can display unique colors for each unique value in this field.<br><i>datatype</i>: name of concept in <a href='/schemas/darwin2resultmapping.xsd'>mapfile schema</a> or specification of new datatype.<br><i>alias</i>: Your name for this field which will also appear on column headings of query results.<br><i>order</i>: any number to designate what order this should be displayed in results table.</td></tr>
<tr><td><b>Repeatable:</b></td><td>No</td></tr>
<tr><td><b>Example:</b></td><td>See following file:</td></tr>
<tr><td><b>Description:</b></td><td> This section defines names of server-side-fields, aliases, and whether we want to view it.  If there are concepts outside the map schema, then they go into sequentially numbered, typed fields (char120:1-8,char255:1-8,longtext:1-4,int:1-4,float:1-4).  The order of the fields MUST match the order of the fields in the tab delimited file being passed to this application.</td></tr></tbody></table>

<p>
<pre><code>&lt;concepts&gt;<br>
&lt;concept viewlist="1" colorlist="0" datatype="darwin:catalognumbertext" alias="CatalogNumber" order="1" /&gt;<br>
&lt;concept viewlist="1" colorlist="1" datatype="darwin:scientificname" alias="ScientificName" order="2" /&gt;<br>
&lt;concept viewlist="0" colorlist="1" datatype="darwin:country" alias="Country" order="9" /&gt;<br>
&lt;concept viewlist="0" colorlist="0" datatype="darwin:stateprovince" alias="StateProvince" order="3" /&gt;<br>
&lt;concept viewlist="1" colorlist="1" datatype="darwin:county" alias="County" order="4" /&gt;<br>
&lt;concept viewlist="0" colorlist="0" datatype="char120:1" alias="id_modifier" order="11" /&gt;<br>
&lt;concept viewlist="0" colorlist="0" datatype="char120:2" alias="Coll_Object_id" order="12" /&gt;<br>
&lt;concept viewlist="0" colorlist="0" datatype="char120:3" alias="type_status" order="5" /&gt;<br>
&lt;concept viewlist="0" colorlist="1" datatype="char120:4" alias="class" order="5" /&gt;<br>
&lt;concept viewlist="0" colorlist="1" datatype="char120:5" alias="order" order="50" /&gt;<br>
&lt;concept viewlist="0" colorlist="1" datatype="char120:6" alias="family" order="10" /&gt;<br>
&lt;concept viewlist="0" colorlist="0" datatype="char120:7" alias="tissues" order="19" /&gt;<br>
&lt;concept viewlist="0" colorlist="0" datatype="char120:8" alias="sex_cde" order="20" /&gt;<br>
&lt;concept viewlist="1" colorlist="0" datatype="darwin:collectioncode" alias="CollectionCode" order="1" /&gt;<br>
&lt;concept viewlist="0" colorlist="0" datatype="darwin:decimallatitude"	alias="DecimalLatitude" order="20" /&gt;<br>
&lt;concept viewlist="0" colorlist="0" datatype="darwin:decimallongitude" alias="DecimalLongitude" order="21" /&gt;<br>
&lt;concept viewlist="0" colorlist="0" datatype="darwin:coordinateuncertaintyinmeters" alias="CoordinateUncertaintyInMeters" order="22" /&gt;<br>
&lt;concept viewlist="1" colorlist="0" datatype="darwin:horizontaldatum"	alias="HorizontalDatum" order="23" /&gt;<br>
&lt;/concepts&gt;<br>
</code></pre>

<h1>GIS Data Section (KML)</h1>
The following is an example of structuring references to KML layers that you wish to be included as background layers:<br>
<pre><code>&lt;gisdata&gt;<br>
&lt;layer title="IUCN Bufo bufo Distribution" legend="1" active="1" url="http://www.iucnredlist.org/apps/redlist/details/54596/0"&gt;&lt;![CDATA[http://amphibiaweb.org/cgi/amphib_ws_shapefile?genus=Bufo&amp;species=canorus]]&gt;&lt;/layer&gt;<br>
&lt;layer title="NE Status" legend="1" active="1" url="http://detailsaboutthisresource.com/"&gt;&lt;![CDATA[http://kml-samples.googlecode.com/svn/trunk/kml/misc/thematic1/states.kml]]&gt;&lt;/layer&gt;<br>
&lt;/gisdata&gt;<br>
</code></pre>

<h1>Closing Tag</h1>
<code>&lt;/berkeleymapper&gt;</code>