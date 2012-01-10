package Core;

import com.vividsolutions.jts.geom.Coordinate;

import java.util.ArrayList;

/**
 * The BMCoordinate extends the basic notion of the JTS Coordinate to include errorRadiusInMeters, datum, and
 * associated fields.  This is particularly useful in that we can represent Coordiantes within JTS Geometries
 * while allowing for spatial operations within JTS and maintaining related data pertinent to BerkeleyMapper.
 * @author jdeck
 */
public class BMCoordinate extends Coordinate {
    public int line = 0;
    public double errorRadiusInMeters = 0;
    public String datum = "";
    public ArrayList fields;
    
    /**
     * Create a coordinate
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