/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package Renderers;

import Core.BMCoordinate;
import Core.BMField;
import Core.BMRow;
import Core.BMSpatialDB;
import com.vividsolutions.jts.geom.Geometry;
import java.util.Arrays;
import java.util.Iterator;

/**
 *
 * @author jdeck
 */
public class BMRenderJSON implements BMRendererInterface {

    private String json = "";

    /**
     * Render a points File as JSON
     * @param ptsFile
     * @return 
     */
    @Override
    public String AllPoints(Geometry g) {
        // Get an iterator for all the rows in this set
        Iterator rows = Arrays.asList(g.getCoordinates()).iterator();
        json = "[\n";
        while (rows.hasNext()) {
            BMCoordinate coord = (BMCoordinate) rows.next();
            Iterator f = coord.fields.iterator();

            json += "{";
            json += "\"line\":" + coord.line;
            json += ",\"lat\":" + coord.x;
            json += ",\"lng\":" + coord.y;
            // only return errorRadius and Datum if appropriate
            if (coord.errorRadiusInMeters != 0) {
                json += ",\"radius\":" + coord.errorRadiusInMeters;
            }
            if (!coord.datum.equals("")) {
                json += ",\"datum\":" + coord.datum;
            }
            json += "}";
            if (rows.hasNext()) {
                json += ",\n";
            }
        }

        json += "\n]";
        return json;
    }

    @Override
    public String Record(int line, BMSpatialDB ptsFile) {
        BMRow r = ptsFile.getRowAt(line);
        BMCoordinate coord = r.getBMCoord();
        String json = "";
        Iterator fields = coord.fields.iterator();
        json += "[\n{";
        while (fields.hasNext()) {
            BMField field = (BMField)fields.next();
            json += "\"" + field.getTitle() + "\":\"" + field.getValue() + "\"";
            if (fields.hasNext()) {
                json += ",";
            }
        }
        json += "}\n]";
        return json;
    }

    @Override
    public String RecordsInPolygon(BMSpatialDB ptsFile, Geometry box) {
        throw new UnsupportedOperationException("Not supported yet.");
    }
}
