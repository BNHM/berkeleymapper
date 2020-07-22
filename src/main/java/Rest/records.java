package Rest;

import Core.BMSession;
import Readers.BMConfigAndTabFileReader;
import Readers.BMFileReader;
import com.vividsolutions.jts.geom.Polygon;
import com.vividsolutions.jts.io.ParseException;
import com.vividsolutions.jts.io.WKTReader;
import Readers.BMTabFileReader;
import Renderers.BMRenderJSON;
import com.vividsolutions.jts.geom.GeometryFactory;

import java.net.MalformedURLException;
import javax.ws.rs.*;
import java.io.IOException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

/**
 * "records" service has a GET and a POST method with different results.
 * <p/>
 * GET input string has a session and a line number and returns
 * a JSON representation of all the fields matching the given line number.
 * <p/>
 * Example:
 * <br>https://localhost/v2/records?session=SESSION_STRING&line=2
 * <br>OR
 * <br>https://localhost:8080/berkeleymapper/v2/records?session=SESSION_STRING&line=2
 * <p/>
 * POST input string has a session an a WKT polygon string as input and
 * returns a JSON list of records and fields matching the point in polygon
 * query.
 * <p/>
 * An error returns an empty response with status code = 204
 *
 * @author jdeck
 */
@Path("records")
public class records {
    ResponseBuilder rb;

    @GET
    @Produces("application/json")
    public Response getRecord(
            @QueryParam("session") String session,
            @QueryParam("line") int line) throws MalformedURLException {

        GeometryFactory geometryFactory = new GeometryFactory();

        // Load the File
        BMSession sess = new BMSession(session);

        try {
            BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);
            rb = Response.ok(new BMRenderJSON().Record(line, f));
        } catch (IOException e) {
            ResponseBuilder rb = Response.status(204);
            return rb.build();
        }

        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }

    @POST
    @Produces("application/json")
    public Response getRecords(
            @FormParam("session") String session,
            @FormParam("polygon") String polygon) throws MalformedURLException {

        // Load the File
        BMSession sess = new BMSession(session);
        try {
            BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);
            rb = Response.ok(new BMRenderJSON().RecordsInPolygon(f, new polygon().create(polygon)));
        } catch (IOException e) {
            ResponseBuilder rb = Response.status(204);
            return rb.build();
        }

        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}
