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
    public int line = 0;
    public double errorRadiusInMeters = 0;
    public String datum = "";
    public ArrayList fields;
    /**
     * @param latitude
     * @param longitude
     * @param fields
     */
    public BMCoordinate(int line, double latitude, double longitude, double errorRadiusInMeters, String datum, ArrayList fields) {
        super(latitude, longitude);
        this.line = line;
        this.errorRadiusInMeters = errorRadiusInMeters;
        this.datum = datum;
        this.fields = fields;
        
    }

}
