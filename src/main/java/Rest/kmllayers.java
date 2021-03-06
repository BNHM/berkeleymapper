package Rest;

import Core.BMSession;
import Readers.BMConfigAndTabFileReader;
import Renderers.BMRenderJSON;

import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;
import java.io.IOException;
import java.net.MalformedURLException;

/**
 * "kmllayers" service returns a JSON representation of all of the KML BMLayers
 * defined by a config file.
 *
 * @author jdeck
 */
@Path("kmllayers")
public class kmllayers {
    ResponseBuilder rb;

    @GET
    @Produces("application/json")
    public Response getKMLLayers(
            @QueryParam("session") String session) throws MalformedURLException {

        // Load the File
        BMSession sess = new BMSession(session);
        try {
            BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);
            rb = Response.ok(new BMRenderJSON().KMLLayers(f));
        } catch (IOException e) {
            rb = Response.status(204);

            rb.header("Access-Control-Allow-Origin", "*");
            return rb.build();
        }
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}