package Rest;

import Core.BMSession;
import Readers.BMConfigAndTabFileReader;
import Core.BMSpatialIntersection;
import org.locationtech.jts.geom.Point;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;
import java.io.IOException;
import java.net.MalformedURLException;
import java.util.Iterator;

/**
 * "spatialIntersection" service returns statistics on spatialIntersections
 * <p/>
 * An error returns an empty response with status code = 204
 *
 * @author jdeck
 */
@Path("statistics")
public class spatialIntersection {
    ResponseBuilder rb;

    @GET
    @Path("/spatialIntersection")
    @Produces("application/json")
    public Response getRecord(
            @QueryParam("session") String session) throws MalformedURLException {

        // Load the File
        BMSession sess = new BMSession(session);
        try {
            BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);

            BMSpatialIntersection spatialIntersection = new BMSpatialIntersection();
            Point[] pointSet = spatialIntersection.createPointSetFromCoordinates(f.getBMCoordinates());

            // Loop each shapefile
            Iterator it = sess.getShapeFiles().iterator();
            StringBuilder sb = new StringBuilder();
            //it.next();
            //while (it.hasNext()) {
                BMSession.ShapeFile shp = (BMSession.ShapeFile) it.next();
                sb.append(spatialIntersection.countPointsInPolygons(
                        shp,
                        pointSet
                ));
            //}
            rb = Response.ok(sb.toString());
        } catch (IOException e) {
            return Response.status(204).build();
        }

        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}
