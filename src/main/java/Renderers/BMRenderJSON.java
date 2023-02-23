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
import java.util.Map;
import java.util.UUID;

/**
 * JSON Representation of BMRendererInterface
 *
 * @author jdeck
 */
public class BMRenderJSON implements BMRendererInterface {


    /**
     * Render a points File as JSON with the following fields:
     * line,lat,lng,radius*,datum*
     * "*" means this is optional
     *
     * @param g
     * @return
     */
    public String AllPoints(Geometry g, BMConfigAndTabFileReader config) {
        StringBuilder json = new StringBuilder();

        // Assign default colors
        BMColors colors = null;
        if (config != null) {
            colors = config.getColors();
        }

        // Get an iterator for all the rows in this set
        Iterator rows = Arrays.asList(g.getCoordinates()).iterator();
        json.append("[\n");

        int count = 0;
        while (rows.hasNext()) {
            // comma and line ending before every instance except for very first
            if (count > 0) {
                json.append(",\n");
            }
            BMRowClassifier coord = (BMRowClassifier) rows.next();

            // Catch any type of error for erroradiusinmeters
            Integer i = coord.errorRadiusInMeters;

            if (i == null || i <= 0) {
                i = 0;
            }

            try {
                // ensure fieldcolor is good
                String fieldcolor = "";

                if (colors.FieldColor(coord, colors) == null) {
                    fieldcolor = "";
                } else {
                    fieldcolor = JSONObject.escape(colors.FieldColor(coord, colors));
                }
                json.append("{\"r\":\"" +
                        coord.line + ";" +
                        coord.latitude + ";" +
                        coord.longitude + ";" +
                        i + ";" +
                        fieldcolor + "\"}");
            } catch (NullPointerException e) {
                System.out.println("unable to map the following coord: " + coord.print());
                e.printStackTrace();
            }
            count++;
        }
        json.append("\n]");
        return json.toString();
    }


    public String Record(int line, BMSpatialFileReader ptsFile) {
        StringBuilder json = new StringBuilder();
        BMRow r = ptsFile.getRowAt(line);
        BMRowClassifier coord = r.getBMCoord();

        Iterator fields = coord.fields.iterator();
        json.append("[\n{");
        int count = 0;
        while (fields.hasNext()) {

            BMField field = (BMField) fields.next();
            if (field.getView()) {
                if (count != 0) {
                    json.append(",");
                }
                count++;
                json.append("\"" + JSONObject.escape(field.getTitleAlias()) + "\":\"" + JSONObject.escape(field.getValue()) + "\"");
            }
        }
        json.append("}\n]");
        return json.toString();
    }

    public String ValueFrequencies(BMSpatialFileReader ptsFile) {
        return ptsFile.getValueFrequencies();
    }

    public String RecordsInPolygon(BMSpatialFileReader ptsFile, Geometry polygon) {
        StringBuilder json = new StringBuilder();

        Geometry subset = ptsFile.BMPointsInPolygon(polygon.buffer(.00001));
        Coordinate[] coords = subset.getCoordinates();
        json.append("[\n");
        for (int i = 0; i < coords.length; i++) {
            // Limit number of records in output to 101
            if (i < 101) {
                BMRowClassifier coord = (BMRowClassifier) coords[i];
                Iterator fields = coord.fields.iterator();
                if (i != 0) {
                    json.append(",");
                }

                json.append("{");
                int count = 0;
                while (fields.hasNext()) {
                    BMField field = (BMField) fields.next();

                    if (field.getView()) {
                        if (count != 0) {
                            json.append(",");
                        }
                        count++;
                        json.append("\"" + JSONObject.escape(field.getTitleAlias()) + "\":\"" + JSONObject.escape(field.getValue()) + "\"");
                    }
                }

                json.append("}");
            }
        }
        json.append("\n]");
        return json.toString();
    }

    /**
     * JSON representation of Layers
     *
     * @param f
     * @return
     */
    public String KMLLayers(BMConfigAndTabFileReader f) {
        StringBuilder json = new StringBuilder();

        f.getSession();
        Object[] layers = f.getLayers();
        json.append("[\n");
        for (int i = 0; i < layers.length; i++) {
            BMLayers layer = (BMLayers) layers[i];
            if (i > 0) {
                json.append(",");
            }
            json.append("{\n");
            json.append("\"link\":\"" + JSONObject.escape(layer.getUrl()) + "\",\n");
            // Add a random number to end of request to circumvent caching issues
            json.append("\"url\":\"" + JSONObject.escape(layer.getLocation()) + "#" + UUID.randomUUID().toString() + "\",\n");
            json.append("\"title\":\"" + JSONObject.escape(layer.getTitle()) + "\",\n");
            json.append("\"visibility\":\"" + layer.getVisible() + "\",\n");
            json.append("\"zoom\":\"expand\"\n");
            json.append("}\n");
        }
        json.append("]\n");

        return json.toString();
    }

    public String Colors(BMConfigAndTabFileReader f) {
        StringBuilder json = new StringBuilder();

        f.getSession();
        BMColors Colors = f.getColors();
        Iterator it = Colors.getColors().iterator();
        json.append("[\n");
        int count = 0;
        while (it.hasNext()) {
            BMColor c = (BMColor) it.next();
            if (count > 0) {
                json.append(",");
            }
            json.append("{\n");
            json.append("\"color\":\"" + JSONObject.escape(c.getColor()) + "\",\n");
            json.append("\"key\":\"" + JSONObject.escape(c.key) + "\",\n");
            json.append("\"label\":\"" + JSONObject.escape(c.label) + "\"\n");
            json.append("}\n");
            count++;
        }
        json.append("]\n");

        return json.toString();
    }

    public String Logos(BMConfigAndTabFileReader f) {
        String output = "[\n";
        f.getSession();
        Iterator it = f.getLogos().entrySet().iterator();

        while (it.hasNext()) {
            Map.Entry pairs = (Map.Entry) it.next();
            output += "  {\"img\":\"" + pairs.getKey() + "\",\"url\":\"" + pairs.getValue() + "\"}";
            if (it.hasNext()) {
                output += ",";
            }
            output += "\n";
            it.remove(); // avoids a ConcurrentModificationException
        }
        output += "]";
        return output;
    }

    /**
     * Return JSON serialization of relevant metadata elements
     *
     * @param f
     * @return
     */
    public Object MetadataElements(BMConfigAndTabFileReader f) {
        StringBuilder sb = new StringBuilder();
        sb.append("{\n");
        sb.append("\t\"legendText\" : \"" + f.getLegendText() + "\"");
        // Add more metadata elements separated by commas here
        sb.append("\n}");
        return sb.toString();
    }


}
