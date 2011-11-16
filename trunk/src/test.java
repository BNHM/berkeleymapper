import Core.BMFile;
import Renderers.BMRenderKML;
import com.vividsolutions.jts.geom.*;
import com.vividsolutions.jts.io.ParseException;
import com.vividsolutions.jts.io.WKTReader;

import java.io.IOException;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 11/9/11
 * Time: 2:49 PM
 * To change this template use File | Settings | File Templates.
 */
public class test {
    static GeometryFactory geometryFactory = new GeometryFactory();

    public static void main(String args[]) {
        String url = "file:///Users/jdeck/IdeaProjects/berkeleymapper/sampledata/amphibiaweb.txt";
        // Load the File
        BMFile f = null;
        try {
            f = new BMFile(url, geometryFactory);
        } catch (IOException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }

        // Adapt the postgres clustering fxn here to duplicate BerkeleyMapper functionality

        // Perform a spatial operation
        Geometry subset = f.BMPointsInPolygon(createPolygon());

        // Render Results
        //new BMRenderKML(f.getMultiPointGeometry());
        String output = new BMRenderKML(subset).toString();
        System.out.println(output);
    }

    /**
     * Create a polygon for testing
     *
     * @return
     */
    private static Polygon createPolygon() {
        WKTReader r = new WKTReader(geometryFactory);
        Polygon p = null;
        try {
            p = (Polygon) r.read("POLYGON ((38 -120, 39 -120, 39 -119, 38 -119, 38 -120))");
        } catch (ParseException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }
        return p;
    }
}