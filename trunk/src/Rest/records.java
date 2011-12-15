/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package Rest;

import Core.BMSession;
import com.vividsolutions.jts.geom.Polygon;
import com.vividsolutions.jts.io.ParseException;
import com.vividsolutions.jts.io.WKTReader;
import Core.BMTabFileReader;
import Renderers.BMRenderJSON;
import com.vividsolutions.jts.geom.GeometryFactory;
import java.net.MalformedURLException;
import javax.ws.rs.*;
import java.io.IOException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

// REST Service
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
