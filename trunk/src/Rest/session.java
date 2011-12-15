/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package Rest;

// REST Service

import Core.BMTabFileReader;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

@Path("session")
public class session {
    
    @GET
    @Produces("text/html")
    public Response getSession(
            @QueryParam("tabfile") String tabfile) throws MalformedURLException {


        // Load the File
        URL url = new URL(tabfile);
        BMTabFileReader f = null;
        try {
            f = new BMTabFileReader(url);
        } catch (IOException e) {
            ResponseBuilder rb = Response.status(204);
            return rb.build();
        }       

        ResponseBuilder rb = Response.ok(f.getSession().getSessionString());

        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}

