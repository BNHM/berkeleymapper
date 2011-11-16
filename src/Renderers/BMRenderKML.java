package Renderers;

import Core.BMCoordinate;
import Core.BMField;
import com.vividsolutions.jts.geom.Geometry;

import java.util.Arrays;
import java.util.Iterator;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 11/9/11
 * Time: 5:38 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMRenderKML {
     private String kml = "";

    public  BMRenderKML(Geometry g) {
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

        /*
                              <Point>
                                      <coordinates>-106.4144400000,38.4041700000</coordinates>
                              </Point>
        */
        // Print Rows
        Iterator i2 = Arrays.asList(g.getCoordinates()).iterator();
        String name = "";
        while (i2.hasNext()) {
            try {
                BMCoordinate coord = (BMCoordinate) i2.next();
                Iterator f = coord.fields.iterator();
                //kml += "<Folder>\n";
                //kml += "  <visibility>1</visibility>\n";
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
                    //System.out.print(field.getValue() + "   ");
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
                //kml += "</Folder>\n";

                //System.out.println("");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        kml += "</Document>\n";
        kml += "</kml>\n";
    }
    public String toString() {
        return kml;
    }
}
