package Rest;

import Core.BMSession;
import Readers.BMConfigAndTabFileReader;
import Readers.BMFileReader;
import Readers.BMSpatialFileReader;
import Renderers.BMRenderSimpleText;
import java.net.MalformedURLException;
import javax.ws.rs.*;
import java.io.IOException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

/**
 * "download" service returns a tab delimited text representation of all of the points
 * present for the given session.
 * <p/>
 * An error returns an empty response with status code = 204
 *
 * @author jdeck
 */
@Path("download")
public class download {
    ResponseBuilder rb;

    @GET
    @Produces("text/plain")
    public Response getAll(
            @QueryParam("session") String session) throws MalformedURLException {

        // Load the File
        BMSession sess = new BMSession(session);
        try {
            if (sess.getMode() == sess.CONFIG) {
                BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);
                rb = Response.ok(new BMRenderSimpleText().AllPoints(f.getMultiPointGeometry(), f));
            } else {
                BMFileReader f = new BMSpatialFileReader(sess);
                rb = Response.ok(new BMRenderSimpleText().AllPoints(f.getMultiPointGeometry(), null));
            }
        } catch (IOException e) {
            rb = Response.status(204);
            rb.header("Access-Control-Allow-Origin", "*");
            return rb.build();
        }
        rb.header("Content-disposition", "attachment; filename=bm2_download.xls");
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }

}

