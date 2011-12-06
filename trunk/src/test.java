import Core.BMTabDelimitedFile;
import Renderers.BMRenderKML;
import com.vividsolutions.jts.geom.*;
import com.vividsolutions.jts.io.ParseException;
import com.vividsolutions.jts.io.WKTReader;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.logging.Level;
import java.util.logging.Logger;

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
        // Initial URL
        URL url = null;
        try {
            url = new URL("file:///Users/jdeck/IdeaProjects/berkeleymapper/sampledata/amphibiaweb.txt");
        } catch (MalformedURLException ex) {
            ex.printStackTrace();
        }
        
        // Load the File
        BMTabDelimitedFile f = null;
        try {
            f = new BMTabDelimitedFile(url);
        } catch (IOException ex) {
            Logger.getLogger(test.class.getName()).log(Level.SEVERE, null, ex);
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
        WKTReader r = new WKTReader(new GeometryFactory());
        Polygon p = null;
        try {
            p = (Polygon) r.read("POLYGON ((38 -120, 39 -120, 39 -119, 38 -119, 38 -120))");
        } catch (ParseException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }
        return p;
    }
}