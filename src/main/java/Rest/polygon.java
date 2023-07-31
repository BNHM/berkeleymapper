package Rest;


import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Polygon;
import org.locationtech.jts.io.ParseException;
import org.locationtech.jts.io.WKTReader;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 2/22/12
 * Time: 5:59 PM
 * To change this template use File | Settings | File Templates.
 */
public class polygon {

    /**
     * Create a polygon for testing
     *
     * @return
     */
    public Polygon create(String polyString) {
        WKTReader r = new WKTReader(new GeometryFactory());
        Polygon p = null;
        try {
            p = (Polygon) r.read(polyString);
        } catch (ParseException e) {
        }
        return p;
    }
}
