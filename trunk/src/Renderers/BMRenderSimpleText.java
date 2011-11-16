package Renderers;

import Core.BMCoordinate;
import Core.BMField;
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
public class BMRenderSimpleText {
    public BMRenderSimpleText(Geometry g) {
        // Print Header
        Iterator i = Arrays.asList(g.getCoordinates()).iterator();
        while (i.hasNext()) {
            BMCoordinate coord = (BMCoordinate) i.next();
            Iterator f = coord.fields.iterator();
            while (f.hasNext()) {
                BMField field = (BMField) f.next();
                System.out.print(field.getTitle() + "   ");
            }
            break;
        }
        System.out.println("");

        // Print Rows
        Iterator i2 = Arrays.asList(g.getCoordinates()).iterator();
        while (i2.hasNext()) {
            try {
            BMCoordinate coord = (BMCoordinate) i2.next();

            Iterator f = coord.fields.iterator();
            while (f.hasNext()) {
                BMField field = (BMField) f.next();
                System.out.print(field.getValue() + "   ");
            }
            System.out.println("");
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
