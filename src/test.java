import Core.BMConfigAndTabFileReader;
import Core.BMTabFileReader;
import Renderers.BMRenderJSON;
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
            //url = new URL("file:///Users/jdeck/IdeaProjects/berkeleymapper/sampledata/amphibiaweb.txt");
            //url = new URL("http://berkeleymappertest.berkeley.edu/schemas/pointverify.txt");
            url = new URL("http://berkeleymappertest.berkeley.edu/amphibiaweb.txt");
        } catch (MalformedURLException ex) {
            ex.printStackTrace();
        }
        
        URL configUrl = null;       
        try {
            configUrl = new URL("http://berkeleymappertest.berkeley.edu/schemas/pointverify.xml");
        } catch (MalformedURLException ex) {
            ex.printStackTrace();
        }
        
        // Load the File
        BMTabFileReader f = null;
        try {
            //f = new BMTabFileReader(url,configUrl);
            f = new BMTabFileReader(url);
        } catch (IOException ex) {
            Logger.getLogger(test.class.getName()).log(Level.SEVERE, null, ex);
        }
                               
        // Adapt the postgres clustering fxn here to duplicate BerkeleyMapper functionality
        
        // Output points
        BMRenderJSON json = new BMRenderJSON();
        String output = json.AllPoints(f.getMultiPointGeometry());
        String id = json.Record(2, f); 
        // Perform a spatial operation
        //String output = new BMRenderJSON().renderPts(f.BMPointsInPolygon(createTestPolygon());
        
        //String output = new BMRenderKML(subset).toString();
        System.out.println(output);
        System.out.println(id);
    }

    /**
     * Create a polygon for testing
     *
     * @return
     */
    private static Polygon createTestPolygon() {
        WKTReader r = new WKTReader(new GeometryFactory());
        Polygon p = null;
        try {
            //p = (Polygon) r.read("POLYGON ((38 -120, 39 -120, 39 -119, 38 -119, 38 -120))");
            p = (Polygon) r.read("POLYGON ((37.2523 -118.7987,37.2020 -118.2081,37.1122 -118.9305,37.2523 -118.7987))");
        } catch (ParseException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }
        return p;
    }
}