package Rest;

import Core.BMSession;
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
 * 
 * GET input string has a session and a line number and returns
 * a JSON representation of all the fields matching the given line number.
 * 
 * POST input string has a session an a WKT polygon string as input and
 * returns a JSON list of records and fields matching the point in polygon
 * query.
 * 
 * An error returns an empty response with status code = 204
 * 
 * @author jdeck
 */
@Path("records")
public class records {

    @GET
    @Produces("application/json")
    public Response getRecord(
            @QueryParam("session") String session,
            @QueryParam("line") int line) throws MalformedURLException {

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

        ResponseBuilder rb = Response.ok(new BMRenderJSON().Record(line, f));//AllPoints(f.getMultiPointGeometry()));
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }

    @POST
    @Produces("application/json")
    public Response getRecords(
            @FormParam("session") String session,
            @FormParam("polygon") String polygon) throws MalformedURLException {

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

        ResponseBuilder rb = Response.ok(new BMRenderJSON().RecordsInPolygon(f, createPolygon(polygon)));//AllPoints(f.getMultiPointGeometry()));
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }

    /**
     * Create a polygon for testing
     *
     * @return
     */
    private static Polygon createPolygon(String polyString) {
        WKTReader r = new WKTReader(new GeometryFactory());
        Polygon p = null;
        try {
            p = (Polygon) r.read(polyString);
        } catch (ParseException e) {
        }
        return p;
    }
}
