package Rest;

import Core.BMSession;
import Readers.BMConfigAndTabFileReader;
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
@Path("downloadSpatial")
public class downloadSpatial {
    ResponseBuilder rb;

    @GET
    @Produces("text/plain")
    public Response getPolygon(
            @QueryParam("session") String session,
            @QueryParam("polygon") String polygon) throws MalformedURLException {

        // Load the File
        BMSession sess = new BMSession(session);
        try {
            BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);
            rb = Response.ok(new BMRenderSimpleText().RecordsInPolygon(f, new polygon().create(polygon)));
        } catch (IOException e) {
            ResponseBuilder rb = Response.status(204);
            return rb.build();
        }

        rb.header("Access-Control-Allow-Origin", "*");
        rb.header("Content-disposition", "attachment; filename=bm2_download_spatial.xls");
        return rb.build();
    }
}


