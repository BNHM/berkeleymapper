package Renderers;

import Core.BMCoordinate;
import Core.BMField;
import Readers.BMConfigAndTabFileReader;
import Readers.BMFileReader;
import Readers.BMSpatialFileReader;
import com.vividsolutions.jts.geom.Geometry;

import java.util.Arrays;
import java.util.Iterator;

/**
 * Render output results in KML.  
 * @author jdeck
 */
public class BMRenderKML implements BMRendererInterface {

    public String AllPoints(Geometry g, BMConfigAndTabFileReader config) {

        String kml = "";
        kml += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        kml += "<kml xmlns=\"http://earth.google.com/kml/2.2\">\n";
        kml += "<Document>\n";
        kml += "  <name>BerkeleyMapper Query</name>\n";
        kml += "  <open>1</open>\n";
        kml += "  <Style id=\"red-star\">\n";
        kml += "    <IconStyle>\n";
        kml += "      <Icon>\n";
        kml += "        <href>http://maps.google.com/mapfiles/kml/paddle/red-stars.png</href>\n";
        kml += "      </Icon>\n";
        kml += "    </IconStyle>\n";
        kml += "  </Style>\n";
        kml += "  <Style id=\"error-line\">\n";
        kml += "    <LineStyle>\n";
        kml += "      <color>ff0000ff</color>\n";
        kml += "      <width>1</width>\n";
        kml += "    </LineStyle>\n";
        kml += "  </Style>\n";

        // Print Rows
        Iterator i2 = Arrays.asList(g.getCoordinates()).iterator();
        String name = "";
        while (i2.hasNext()) {
            try {
                BMCoordinate coord = (BMCoordinate) i2.next();
                Iterator f = coord.fields.iterator();

                kml += "<Placemark>\n";
                kml += "  <description>\n";
                kml += "    <![CDATA[";
                int count = 0;
                while (f.hasNext()) {
                    BMField field = (BMField) f.next();
                    // Take first row value and use as title
                    if (count == 0) {
                        name = field.getValue();
                    }
                    kml += field.getTitle() + " = " + field.getValue() + "<br/>";
                    count++;
                }
                kml += "    ]]>\n";
                kml += "  </description>\n";
                kml += "  <name>" + name + "</name>\n";
                kml += "  <Point>\n";
                kml += "    <coordinates>" + coord.y + "," + coord.x + "</coordinates>";
                kml += "  </Point>\n";
                kml += "  <styleUrl>#red-star</styleUrl>\n";
                kml += "</Placemark>\n";
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        kml += "</Document>\n";
        kml += "</kml>\n";
        return kml;
    }

    public String Record(int line, BMSpatialFileReader ptsFile) {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public String RecordsInPolygon(BMSpatialFileReader ptsFile, Geometry polygon) {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public String KMLLayers(BMConfigAndTabFileReader f) {
        return null;  //To change body of implemented methods use File | Settings | File Templates.
    }
     public String Colors(BMConfigAndTabFileReader f) {
        return null;  //To change body of implemented methods use File | Settings | File Templates.
    }

 
}
