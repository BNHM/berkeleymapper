/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package Renderers;

import Core.BMCoordinate;
import Core.BMField;
import Core.BMRow;
import Readers.BMSpatialFileReader;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Geometry;
import org.json.simple.JSONObject;

import java.util.Arrays;
import java.util.Iterator;

/**
 * JSON Representation of BMRendererInterface
 * @author jdeck
 */
public class BMRenderJSON implements BMRendererInterface {

    private String json = "";

    /**
     * Render a points File as JSON with the following fields:
     * line,lat,lng,radius*,datum*
     * "*" means this is optional
     * @param g
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
                json += ",\"datum\":\"" + JSONObject.escape(coord.datum)+"\"";
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
    public String Record(int line, BMSpatialFileReader ptsFile) {
        BMRow r = ptsFile.getRowAt(line);
        BMCoordinate coord = r.getBMCoord();
        String json = "";
        Iterator fields = coord.fields.iterator();
        json += "[\n{";
        while (fields.hasNext()) {
            BMField field = (BMField) fields.next();
            json += "\"" + JSONObject.escape(field.getTitle()) + "\":\"" + JSONObject.escape(field.getValue()) + "\"";
            if (fields.hasNext()) {
                json += ",";
            }
        }
        json += "}\n]";
        return json;
    }

    @Override
    public String RecordsInPolygon(BMSpatialFileReader ptsFile, Geometry polygon) {
        Geometry subset = ptsFile.BMPointsInPolygon(polygon.buffer(.00001));
        Coordinate[] coords = subset.getCoordinates();
        String json = "[\n";
        for (int i = 0; i < coords.length; i++) {
            BMCoordinate coord = (BMCoordinate) coords[i];
            Iterator fields = coord.fields.iterator();
            if (i != 0) {
                json += ",";
            }

            json += "{";
            while (fields.hasNext()) {
                BMField field = (BMField) fields.next();
                json += "\"" + JSONObject.escape(field.getTitle()) + "\":\"" + JSONObject.escape(field.getValue()) + "\"";
                if (fields.hasNext()) {
                    json += ",";
                }
            }
            json += "}";
        }
        json += "\n]";
        return json;
    }
}
