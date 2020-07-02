package Core;

import Readers.BMConfigAndTabFileReader;
import Readers.BMTabFileReader;
import Renderers.BMRenderJSON;
import Renderers.BMRenderKML;
import Renderers.BMRenderSimpleText;
import com.vividsolutions.jts.geom.*;
import com.vividsolutions.jts.io.ParseException;
import com.vividsolutions.jts.io.WKTReader;

import javax.swing.plaf.basic.BasicInternalFrameTitlePane;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Class useful for testing outside of REST services
 *
 * @author jdeck
 */
public class test {
    //static GeometryFactory geometryFactory = new GeometryFactory();
     // change in test
    public static void main(String args[]) {
        // Initial URL
        URL url = null;
        try {
            url = new URL("https://berkeleymappertest.berkeley.edu/schemas/arctos.txt");
            url = new URL("https://amphibiaweb.org/tmpfiles/980866");

        } catch (MalformedURLException ex) {
            ex.printStackTrace();
        }

        URL configUrl = null;
        try {
            configUrl = new URL("https://berkeleymappertest.berkeley.edu/schemas/arctos.xml");
            configUrl = new URL("https://arctos.database.museum/bnhmMaps/tabfiles/arctos_521.xml");
            configUrl = new URL("https://darwin.berkeley.edu/foo.xml");
            configUrl = new URL("https://amphibiaweb.org/tmpfiles/bm_config_48767.xml");


        } catch (MalformedURLException ex) {
            ex.printStackTrace();
        }
        // Load the File
        BMConfigAndTabFileReader f = null;
        try {
            f = new BMConfigAndTabFileReader(url, configUrl);
        } catch (IOException ex) {
            Logger.getLogger(test.class.getName()).log(Level.SEVERE, null, ex);
        }

        BMConfigAndTabFileReader fs = null;
        try {
            fs = new BMConfigAndTabFileReader(f.getSession());
        } catch (IOException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }

        // Adapt the postgres clustering fxn here to duplicate BerkeleyMapper functionality

        // Output points
        //String output = new BMRenderKML().AllPoints(fs.getMultiPointGeometry(), fs);
        String output = new BMRenderJSON().AllPoints(fs.getMultiPointGeometry(),fs);
        System.out.println(output);
        for (int i=10; i< 200; i++) {
        System.out.println(new BMRenderJSON().Record(i, fs));
        }

        //System.out.println(new BMRenderJSON().Logos(fs));
        // Perform a spatial operation
        //output = new BMRenderJSON().RecordsInPolygon(f,createTestPolygon());

        //String output = new BMRenderKML(subset).toString();
        //System.out.println(new BMRenderJSON().KMLLayers(fs));
        //System.out.println(new BMRenderJSON().Colors(fs));

        //System.out.println(id);

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
            p = (Polygon) r.read("POLYGON ((67.2523 -108.7987,37.2020 -138.2081,37.1122 -138.9305,67.2523 -108.7987))");
        } catch (ParseException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }
        return p;
    }
}
