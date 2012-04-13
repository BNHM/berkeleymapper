package Renderers;

import Core.BMRowClassifier;
import Core.BMField;
import Readers.BMConfigAndTabFileReader;
import Readers.BMSpatialFileReader;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Geometry;

import java.util.Arrays;
import java.util.Iterator;

/**
 * Render output results as Simple Text.  Useful for testing.
 *
 * @author jdeck
 */
public class BMRenderSimpleText implements BMRendererInterface {

    public String AllPoints(Geometry g, BMConfigAndTabFileReader config) {
        String strRet = "";
        // Print Header
        Iterator i = Arrays.asList(g.getCoordinates()).iterator();
        while (i.hasNext()) {
            BMRowClassifier coord = (BMRowClassifier) i.next();
            Iterator f = coord.fields.iterator();
            while (f.hasNext()) {
                BMField field = (BMField) f.next();
                strRet += field.getTitleAlias() + "\t";
            }
            break;
        }
        strRet += "\n";

        // Print Rows
        Iterator i2 = Arrays.asList(g.getCoordinates()).iterator();
        while (i2.hasNext()) {
            try {
                BMRowClassifier coord = (BMRowClassifier) i2.next();

                Iterator f = coord.fields.iterator();
                while (f.hasNext()) {
                    BMField field = (BMField) f.next();
                    strRet += field.getValue() + "\t";
                }
                strRet += "\n";
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return strRet;
    }

    public String Record(int line, BMSpatialFileReader ptsFile) {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public String RecordsInPolygon(BMSpatialFileReader ptsFile, Geometry polygon) {
        String tabtext = "";
        Geometry subset = ptsFile.BMPointsInPolygon(polygon.buffer(.00001));
         
        // Print Header
        Iterator headIt = Arrays.asList(subset.getCoordinates()).iterator();
        while (headIt.hasNext()) {
            BMRowClassifier coord = (BMRowClassifier) headIt.next();
            Iterator f = coord.fields.iterator();
            while (f.hasNext()) {
                BMField field = (BMField) f.next();
                tabtext += field.getTitleAlias() + "\t";
            }
            break;
        }
        tabtext += "\n";
        
        Coordinate[] coords = subset.getCoordinates();
        for (int i = 0; i < coords.length; i++) {
            BMRowClassifier coord = (BMRowClassifier) coords[i];
            //if (i != 0) {
            //    tabtext += "\t";
            //}         
            
            Iterator fields = coord.fields.iterator();
            // data fields
            while (fields.hasNext()) {
                BMField field = (BMField) fields.next();
                tabtext += field.getValue();
                if (fields.hasNext()) {
                    tabtext += "\t";
                }
            }
            tabtext += "\n";
        }
        return tabtext;
    }

    public String KMLLayers(BMConfigAndTabFileReader f) {
        return null;  //To change body of implemented methods use File | Settings | File Templates.
    }

    public String Colors(BMConfigAndTabFileReader f) {
        return null;  //To change body of implemented methods use File | Settings | File Templates.
    }


}
