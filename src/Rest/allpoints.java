package Rest;

import Core.BMTabFileReader;
import Renderers.BMRenderJSON;
import Renderers.BMRenderKML;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.GeometryFactory;

import java.net.MalformedURLException;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.io.IOException;
import java.io.PrintWriter;
import java.net.URL;
import java.util.logging.Logger;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

// REST Service
@Path("allpoints")
public class allpoints {
    
    @GET
    @Produces("application/json")
    public Response getRelations(
            @QueryParam("tabfile") String tabfile) throws MalformedURLException {

        GeometryFactory geometryFactory = new GeometryFactory();

        // Load the File
        URL url = new URL(tabfile);
        BMTabFileReader f = null;
        try {
            f = new BMTabFileReader(url);
        } catch (IOException e) {
            ResponseBuilder rb = Response.ok("Unable to fetch " + tabfile);
            return rb.build();
        }       

        ResponseBuilder rb = Response.ok(new BMRenderJSON().AllPoints(f.getMultiPointGeometry()));
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}
