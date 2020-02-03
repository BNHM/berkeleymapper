package Rest;

import Core.BMSession;
import Readers.BMConfigAndTabFileReader;
import Readers.BMFileReader;
import Readers.BMSpatialFileReader;
import Renderers.BMRenderKML;
import java.net.MalformedURLException;
import javax.ws.rs.*;
import java.io.IOException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

/**
 * downloadKML
 *
 * @author jdeck
 */
@Path("downloadKML")
public class downloadKML {
    ResponseBuilder rb;

    @GET
    @Produces("application/vnd.google-earth.kml+xml")
    public Response downloadKML(
            @QueryParam("session") String session) throws MalformedURLException {
         // Load the File
        BMSession sess = new BMSession(session);
        try {
            if (sess.getMode() == sess.CONFIG) {
                BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);
                rb = Response.ok(new BMRenderKML().AllPoints(f.getMultiPointGeometry(), f));
            } else {
                BMFileReader f = new BMSpatialFileReader(sess);
                rb = Response.ok(new BMRenderKML().AllPoints(f.getMultiPointGeometry(), null));
            }
        } catch (IOException e) {
            rb = Response.status(204);
            rb.header("Access-Control-Allow-Origin", "*");
            return rb.build();
        }
        rb.header("Content-disposition", "attachment; filename=bm2_download.kml");
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}