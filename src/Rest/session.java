package Rest;

import Readers.BMTabFileReader;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

/**
 * "session" service converts a data file from an external server to a 
 * tab-delimited file on the berkeleymapper server.
 * Returns a text/html of the session string, which is given by a UUID.
 * This session string is used for all future interactions with this datafile, 
 * eliminating the need for remotely querying external file.
 *  
 * Example Use:
 * http://jlocalhost:8080/berkeleymapper/v2/session?tabfile=http://darwin.berkeley.edu/amphibiaweb.txt
 * 
 *  An error returns an empty response with status code = 204
 * 
 * @author jdeck
 */
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

