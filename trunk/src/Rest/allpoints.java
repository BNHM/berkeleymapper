package Rest;

import Core.BMSession;
import Readers.BMTabFileReader;
import Renderers.BMRenderJSON;
import com.vividsolutions.jts.geom.GeometryFactory;
import java.net.MalformedURLException;
import javax.ws.rs.*;
import java.io.IOException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

/**
 * "allpoints" service returns a JSON representation of all of the points 
 * present for the given session.  The JSON format returns the following fields:
 * 
 * line,lat,lng,radius,datum
 * 
 * http://johns-macbook-air.local:8080/berkeleymapper/v2/allpoints?session=<SESSION_STRING>
 *
 * An error returns an empty response with status code = 204
 * @author jdeck
 */
@Path("allpoints")
public class allpoints {
    
    @GET
    @Produces("application/json")
    public Response getAllPoints(
            @QueryParam("session") String session) throws MalformedURLException {

        GeometryFactory geometryFactory = new GeometryFactory();

        // Load the File
        BMSession sess = new BMSession(session);
        BMTabFileReader f = null;
        try {
            f = new BMTabFileReader(sess);
        } catch (IOException e) {
            ResponseBuilder rb = Response.status(204);
            return rb.build();
        }       

        ResponseBuilder rb = Response.ok(new BMRenderJSON().AllPoints(f.getMultiPointGeometry()));
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}
