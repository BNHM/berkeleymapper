package Core;

import com.vividsolutions.jts.geom.Coordinate;

/**
 * BMCoordinate extends the basic notion of the JTS Coordinate to include errorRadiusInMeters and datum.
 * This is particularly useful in that we can represent Coordinates within JTS Geometries
 * while allowing for spatial operations within JTS and maintaining related data pertinent to BerkeleyMapper.
 */
public class BMCoordinate extends Coordinate {
    public double latitude;
    public double longitude;
    public int errorRadiusInMeters = 0;
    public String datum = "";

    public BMCoordinate(double latitude, double longitude, double errorRadiusInMeters, String datum) {
        super(latitude, longitude);
        this.datum = datum;

        this.errorRadiusInMeters = (int) errorRadiusInMeters;

        this.longitude = longitude;
        if (latitude > 85) latitude = 85;
        if (latitude < -85) latitude = -85;
        this.latitude = latitude;
    }


}
