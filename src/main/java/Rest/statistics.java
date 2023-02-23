package Rest;

import Core.BMSession;
import Readers.BMConfigAndTabFileReader;
import Renderers.BMRenderJSON;
import com.vividsolutions.jts.geom.GeometryFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;
import java.io.IOException;
import java.net.MalformedURLException;

/**
 * "statistics" service returns statistics on files
 * <p/>
 * An error returns an empty response with status code = 204
 *
 * @author jdeck
 */
@Path("statistics")
public class statistics {
    ResponseBuilder rb;

    @GET
    @Path("/frequencies")
    @Produces("application/json")
    public Response getRecord(
            @QueryParam("session") String session) throws MalformedURLException {

        // Load the File
        BMSession sess = new BMSession(session);

        try {
            BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);
            rb = Response.ok(new BMRenderJSON().ValueFrequencies(f));
        } catch (IOException e) {
            return Response.status(204).build();
        }

        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}
