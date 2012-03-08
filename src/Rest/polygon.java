package Rest;

import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.Polygon;
import com.vividsolutions.jts.io.ParseException;
import com.vividsolutions.jts.io.WKTReader;

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
