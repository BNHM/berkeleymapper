package Core;

import com.vividsolutions.jts.geom.Coordinate;

import java.util.ArrayList;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 11/9/11
 * Time: 3:26 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMCoordinate extends Coordinate {
    public ArrayList fields;
    /**
     * @param latitude
     * @param longitude
     * @param fields
     */
    public BMCoordinate(double latitude, double longitude, ArrayList fields) {
        super(latitude, longitude);
        this.fields = fields;
    }

}
