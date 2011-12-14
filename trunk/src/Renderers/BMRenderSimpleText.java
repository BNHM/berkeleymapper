package Renderers;

import Core.BMCoordinate;
import Core.BMField;
import Core.BMSpatialDB;
import com.vividsolutions.jts.geom.Geometry;

import java.util.Arrays;
import java.util.Iterator;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 11/9/11
 * Time: 5:38 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMRenderSimpleText implements BMRendererInterface {
    
     @Override
    public String AllPoints(Geometry g) {
        String strRet = "";
        // Print Header
        Iterator i = Arrays.asList(g.getCoordinates()).iterator();
        while (i.hasNext()) {
            BMCoordinate coord = (BMCoordinate) i.next();
            Iterator f = coord.fields.iterator();
            while (f.hasNext()) {
                BMField field = (BMField) f.next();
                strRet += field.getTitle() + "   ";
            }
            break;
        }
        strRet += "\n";
        
        // Print Rows
        Iterator i2 = Arrays.asList(g.getCoordinates()).iterator();
        while (i2.hasNext()) {
            try {
            BMCoordinate coord = (BMCoordinate) i2.next();

            Iterator f = coord.fields.iterator();
            while (f.hasNext()) {
                BMField field = (BMField) f.next();
                strRet += field.getValue() + "   ";
            }
            strRet += "\n";
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
        return strRet;
    }

    @Override
    public String Record(int line, BMSpatialDB ptsFile) {
        throw new UnsupportedOperationException("Not supported yet.");
    }

    @Override
    public String RecordsInPolygon(BMSpatialDB ptsFile, Geometry polygon) {
        throw new UnsupportedOperationException("Not supported yet.");
    }
   
 
}
