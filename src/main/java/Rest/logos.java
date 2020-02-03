package Rest;

import Core.BMSession;
import Readers.BMConfigAndTabFileReader;
import Renderers.BMRenderJSON;
import java.net.MalformedURLException;
import javax.ws.rs.*;
import java.io.IOException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

/**
 * "logos" service returns a JSON representation of all of the Logos
 * defined by a config file.
 *
 * @author jdeck
 */
@Path("logos")
public class logos {
    ResponseBuilder rb;

    @GET
    @Produces("application/json")
    public Response getKMLLayers(
            @QueryParam("session") String session) throws MalformedURLException {

        // Load the File
        BMSession sess = new BMSession(session);
        try {
            BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);
            rb = Response.ok(new BMRenderJSON().Logos(f));
        } catch (IOException e) {
            rb = Response.status(204);
            rb.header("Access-Control-Allow-Origin", "*");
            return rb.build();
        }
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}

