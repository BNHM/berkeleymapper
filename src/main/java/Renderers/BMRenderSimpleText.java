package Renderers;

import Core.BMCoordinate;
import Core.BMRowClassifier;
import Core.BMField;
import Readers.BMConfigAndTabFileReader;
import Readers.BMSpatialFileReader;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.Geometry;


import java.util.Arrays;
import java.util.Iterator;

/**
 * Render output results as Simple Text.  Useful for testing.
 *
 * @author jdeck
 */
public class BMRenderSimpleText implements BMRendererInterface {

    public String AllPoints(BMCoordinate[] bmCoordinates, BMConfigAndTabFileReader config) {
        StringBuilder strRet = new StringBuilder();

        // Print Header
        Iterator i = Arrays.asList(bmCoordinates).iterator();
        while (i.hasNext()) {
            BMRowClassifier coord = (BMRowClassifier) i.next();
            Iterator f = coord.fields.iterator();
            while (f.hasNext()) {
                BMField field = (BMField) f.next();
                strRet.append(field.getTitleAlias() + "\t");
            }
            break;
        }
        strRet.append("\n");

        // Print Rows
        Iterator i2 = Arrays.asList(bmCoordinates).iterator();
        while (i2.hasNext()) {
            try {
                BMRowClassifier coord = (BMRowClassifier) i2.next();

                Iterator f = coord.fields.iterator();
                while (f.hasNext()) {
                    BMField field = (BMField) f.next();
                    strRet.append(field.getValue() + "\t");
                }
                strRet.append("\n");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return strRet.toString();
    }


    public String Record(int line, BMSpatialFileReader ptsFile) {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    public String RecordsInPolygon(BMSpatialFileReader ptsFile, Geometry polygon) {
        StringBuilder tabtext = new StringBuilder();
        Geometry subset = ptsFile.BMPointsInPolygon(polygon.buffer(.00001));
         
        // Print Header
        Iterator headIt = Arrays.asList(subset.getCoordinates()).iterator();
        while (headIt.hasNext()) {
            BMRowClassifier coord = (BMRowClassifier) headIt.next();
            Iterator f = coord.fields.iterator();
            while (f.hasNext()) {
                BMField field = (BMField) f.next();
                tabtext.append(field.getTitleAlias() + "\t");
            }
            break;
        }
        tabtext.append("\n");
        
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
                tabtext.append(field.getValue());
                if (fields.hasNext()) {
                    tabtext.append("\t");
                }
            }
            tabtext.append("\n");
        }
        return tabtext.toString();
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
