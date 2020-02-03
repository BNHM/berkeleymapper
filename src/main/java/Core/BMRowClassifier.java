package Core;

import com.vividsolutions.jts.geom.Coordinate;

import java.util.ArrayList;

/**
 * The BMRowClassifier tracks rows by adding coordinate information, fields, and lin numbers.
 * @author jdeck
 */
public class BMRowClassifier extends BMCoordinate {
    public int line = 0;
    public ArrayList fields;
    
    /**
     * Create a coordinate
     * @param latitude
     * @param longitude
     * @param fields
     */
    public BMRowClassifier(int line, double latitude, double longitude, double errorRadiusInMeters, String datum, ArrayList fields) {
        super(latitude,longitude,errorRadiusInMeters,datum);
        this.line = line;
        this.fields = fields;
    }
    public BMRowClassifier (int line, BMCoordinate coord, ArrayList fields) {
        super(coord.latitude,coord.longitude,coord.errorRadiusInMeters,coord.datum);
        this.line = line;
        this.fields = fields;
    }
    public String print() {
        return line + ";" + latitude + ";" + longitude + ";" + errorRadiusInMeters;
    }
}
