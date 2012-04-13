/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package Renderers;

import Core.*;
import Readers.BMConfigAndTabFileReader;
import Readers.BMSpatialFileReader;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Geometry;
import org.json.simple.JSONObject;

import java.util.Arrays;
import java.util.Iterator;

/**
 * JSON Representation of BMRendererInterface
 *
 * @author jdeck
 */
public class BMRenderJSON implements BMRendererInterface {

    private String json = "";

    /**
     * Render a points File as JSON with the following fields:
     * line,lat,lng,radius*,datum*
     * "*" means this is optional
     *
     * @param g
     * @return
     */
    public String AllPoints(Geometry g, BMConfigAndTabFileReader config) {
        BMColors colors = null;
        if (config != null) {
            colors = config.getColors();
        }

        // Get an iterator for all the rows in this set
        Iterator rows = Arrays.asList(g.getCoordinates()).iterator();
        json = "[\n";

        while (rows.hasNext()) {

            BMRowClassifier coord = (BMRowClassifier) rows.next();


            json += "{";
            json += "\"line\":" + coord.line;
            json += ",\"lat\":" + coord.x;
            json += ",\"lng\":" + coord.y;
            // only return errorRadius and Datum if appropriate
            if (coord.errorRadiusInMeters != 0) {
                json += ",\"radius\":" + coord.errorRadiusInMeters;
            }
            if (!coord.datum.equals("")) {
                json += ",\"datum\":\"" + JSONObject.escape(coord.datum) + "\"";
            }
            if (colors != null) {
                json += ",\"color\":\"" + JSONObject.escape(colors.FieldColor(coord, colors)) + "\"";
            }
            json += "}";
            if (rows.hasNext()) {
                json += ",\n";
            }
        }

        json += "\n]";
        return json;
    }



    public String Record(int line, BMSpatialFileReader ptsFile) {
        BMRow r = ptsFile.getRowAt(line);
        BMRowClassifier coord = r.getBMCoord();
        String json = "";
        Iterator fields = coord.fields.iterator();
        json += "[\n{";
        while (fields.hasNext()) {
            BMField field = (BMField) fields.next();
            json += "\"" + JSONObject.escape(field.getTitleAlias()) + "\":\"" + JSONObject.escape(field.getValue()) + "\"";
            if (fields.hasNext()) {
                json += ",";
            }
        }
        json += "}\n]";
        return json;
    }

    public String RecordsInPolygon(BMSpatialFileReader ptsFile, Geometry polygon) {
        Geometry subset = ptsFile.BMPointsInPolygon(polygon.buffer(.00001));
        Coordinate[] coords = subset.getCoordinates();
        String json = "[\n";
        for (int i = 0; i < coords.length; i++) {
            BMRowClassifier coord = (BMRowClassifier) coords[i];
            Iterator fields = coord.fields.iterator();
            if (i != 0) {
                json += ",";
            }

            json += "{";
            while (fields.hasNext()) {
                BMField field = (BMField) fields.next();
                json += "\"" + JSONObject.escape(field.getTitleAlias()) + "\":\"" + JSONObject.escape(field.getValue()) + "\"";
                if (fields.hasNext()) {
                    json += ",";
                }
            }
            json += "}";
        }
        json += "\n]";
        return json;
    }

    /**
     * JSON representation of Layers
     *
     * @param f
     * @return
     */
    public String KMLLayers(BMConfigAndTabFileReader f) {
        f.getSession();
        Object[] layers = f.getLayers();

        json = "[\n";
        for (int i = 0; i < layers.length; i++) {
            BMLayers layer = (BMLayers) layers[i];
            if (i > 0) {
                json += ",";
            }
            json += "{\n";
            json += "\"link\":\"" + JSONObject.escape(layer.getUrl()) + "\",\n";
            json += "\"url\":\"" + JSONObject.escape(layer.getLocation()) + "\",\n";
            json += "\"title\":\"" + JSONObject.escape(layer.getTitle()) + "\",\n";
            json += "\"visibility\":\"" + layer.getVisible() + "\",\n";
            json += "\"zoom\":\"expand\"\n";
            json += "}\n";
        }
        json += "]\n";

        return json;
    }

    public String Colors(BMConfigAndTabFileReader f) {
        f.getSession();
        BMColors Colors = f.getColors();
        Iterator it = Colors.getColors().iterator();
        json = "[\n";
        int count = 0;
        while (it.hasNext()) {
            BMColor c = (BMColor) it.next();
            if (count > 0) {
                json += ",";
            }
            json += "{\n";
            json += "\"color\":\"" + JSONObject.escape(c.getColor()) + "\",\n";
            json += "\"key\":\"" + JSONObject.escape(c.key) + "\",\n";
            json += "\"label\":\"" + JSONObject.escape(c.label) + "\"\n";
            json += "}\n";
            count++;
        }
        json += "]\n";

        return json;
    }
}
