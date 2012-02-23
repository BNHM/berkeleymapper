package Rest;

import Core.BMSession;
import Readers.BMConfigAndTabFileReader;
import Readers.BMFileReader;
import Readers.BMSpatialFileReader;
import Renderers.BMRenderJSON;

import java.net.MalformedURLException;
import javax.ws.rs.*;
import java.io.IOException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

/**
 * "allpoints" service returns a JSON representation of all of the points
 * present for the given session.  The JSON format returns the following fields:
 * <p/>
 * line,lat,lng,radius,datum
 * <p/>
 * Example:
 * <br>http://localhost/v2/allpoints?session=SESSION_STRING
 * <br>OR
 * <br>http://localhost:8080/berkeleymapper/v2/allpoints?session=SESSION_STRING
 * <p/>
 * An error returns an empty response with status code = 204
 *
 * @author jdeck
 */
@Path("allpoints")
public class allpoints {
    ResponseBuilder rb;

    @GET
    @Produces("application/json")
    public Response getAllPoints(
            @QueryParam("session") String session) throws MalformedURLException {

        // Load the File
        BMSession sess = new BMSession(session);
        try {
            if (sess.getMode() == sess.CONFIG) {
                BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);
                rb = Response.ok(new BMRenderJSON().AllPoints(f.getMultiPointGeometry(), f));
            } else {
                BMFileReader f = new BMSpatialFileReader(sess);
                rb = Response.ok(new BMRenderJSON().AllPoints(f.getMultiPointGeometry(), null));
            }
        } catch (IOException e) {
            rb = Response.status(204);
            rb.header("Access-Control-Allow-Origin", "*");
            return rb.build();
        }
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }


}
