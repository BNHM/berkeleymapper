package Renderers;

import Core.BMCoordinate;
import Core.BMRowClassifier;
import Core.BMField;
import Readers.BMConfigAndTabFileReader;
import Readers.BMSpatialFileReader;
import org.locationtech.jts.geom.Geometry;

import java.util.Arrays;
import java.util.Iterator;

/**
 * Render output results in KML.
 *
 * @author jdeck
 */
public class BMRenderKML implements BMRendererInterface {

    public String AllPoints(BMCoordinate[] bmCoordinates, BMConfigAndTabFileReader config) {

        StringBuilder kml = new StringBuilder();
        kml.append("");
        kml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        kml.append("<kml xmlns=\"http://earth.google.com/kml/2.2\">\n");
        kml.append("<Document>\n");
        kml.append("  <name>BerkeleyMapper Query</name>\n");
        kml.append("  <open>1</open>\n");
        kml.append("  <Style id=\"red-star\">\n");
        kml.append("    <IconStyle>\n");
        kml.append("      <Icon>\n");
        kml.append("        <href>https://maps.google.com/mapfiles/kml/paddle/red-stars.png</href>\n");
        kml.append("      </Icon>\n");
        kml.append("    </IconStyle>\n");
        kml.append("  </Style>\n");
        kml.append("  <Style id=\"error-line\">\n");
        kml.append("    <LineStyle>\n");
        kml.append("      <color>ff0000ff</color>\n");
        kml.append("      <width>1</width>\n");
        kml.append("    </LineStyle>\n");
        kml.append("  </Style>\n");

        // Print Rows
        Iterator i2 = Arrays.asList(bmCoordinates).iterator();
        String name = "";
        // Limit numFields to display if the set of data is large
        int numFields = 15;
        if (Arrays.asList(bmCoordinates).size() > 1000) {
            numFields = 5;
        } else if (Arrays.asList(bmCoordinates).size() > 500) {
            numFields = 8;
        }
        // System.out.println(Arrays.asList(g.getCoordinates()).size());
        // System.out.println(numFields);
        int rows = 0;
        while (i2.hasNext()) {

            try {
                BMRowClassifier coord = (BMRowClassifier) i2.next();
                Iterator f = coord.fields.iterator();

                kml.append("<Placemark>\n");
                kml.append("  <description>\n");
                kml.append("    <![CDATA[");
                int count = 0;
                // Print fields
                while (f.hasNext()) {

                    BMField field = (BMField) f.next();
                    // Take first row value and use as title
                    // Don't use a title for now!, too unpredictable
                    //if (count == 0) {
                    //    name = field.getValue();
                    //}
                    // Also, limit numFields based on largge sets
                    if (count < numFields)
                        //System.out.print(field.getValue() + "\t");
                        kml.append(field.getTitleAlias() + " = " + field.getValue() + "<br/>");
                    count++;
                }
                kml.append("    ]]>\n");
                kml.append("  </description>\n");
                kml.append("  <name>" + name + "</name>\n");
                kml.append("  <Point>\n");
                kml.append("    <coordinates>" + coord.y + "," + coord.x + "</coordinates>");
                kml.append("  </Point>\n");
                kml.append("  <styleUrl>#red-star</styleUrl>\n");
                kml.append("</Placemark>\n");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        kml.append("</Document>\n");
        kml.append("</kml>\n");
        return kml.toString();
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

    @Override
    public String Logos(BMConfigAndTabFileReader f) {
        return null;  //To change body of implemented methods use File | Settings | File Templates.
    }


}
