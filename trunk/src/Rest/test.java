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
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

// REST Service
@Path("test")
public class test {

    @GET
    @Produces("application/json")
    public Response getRelations() throws MalformedURLException {

        String content = "["
                + "\n{\"id\":38,\"lat\":37.7505,\"lng\":-119.72898,\"radius\":3000},"
                + "\n{\"id\":39,\"lat\":37.79275,\"lng\":-119.32952,\"radius\":10000}"
                + "\n]";
        ResponseBuilder rb = Response.ok(content);
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}
