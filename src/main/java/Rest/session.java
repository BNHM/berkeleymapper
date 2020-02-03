package Rest;

import Readers.BMConfigAndTabFileReader;
import Readers.BMTabFileReader;

import java.io.FileReader;
import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

/**
 * "session" service converts a data file from an external server to a
 * tab-delimited file on the berkeleymapper server.
 * Returns a text/html of the session string, which is given by a UUID.
 * This session string is used for all future interactions with this datafile,
 * eliminating the need for remotely querying external file.
 * <p/>
 * Example:
 * <br>http://localhost/v2/session?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/awtest.txt
 * <br>OR
 * <br>http://localhost:8080/berkeleymapper/v2/session?tabfile=https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/awtest.txt
 * <p/>
 * An error returns an empty response with status code = 204
 *
 * @author jdeck
 */
@Path("/session")
public class session {
    ResponseBuilder rb = null;

    @GET
    @Produces("text/html")
    public Response getSession(
            @QueryParam("tabfile") String tabfile,
            @QueryParam("configfile") String configfile) throws MalformedURLException {


        // See if configfile is passed in
        URL configUrl = null;
        try {
            configUrl = new URL(configfile);
        } catch (Exception e) {
            configUrl = null;
            System.err.println(e.getMessage());
            rb = Response.status(204);
        }

        // Load the Tab File
        URL url = new URL(tabfile);
        try {
            BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(url, configUrl);
            rb = Response.ok(f.getSession().getSessionString());
        } catch (IOException e) {
            rb = Response.status(204);
            return rb.build();
        }

        // Return results
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }

    @POST
    @Produces("text/html")
    public Response getSessionPOST(
            @FormParam("tabdata") String tabdata,
            @FormParam("configfile") String configfile) throws MalformedURLException {


        // See if configfile is passed in
        URL configUrl = null;
        try {
            configUrl = new URL(configfile);
        } catch (Exception e) {
            configUrl = null;
            System.err.println(e.getMessage());
            rb = Response.status(204);
        }

        // Load the Tab File
        //URL url = new URL(tabdata);
        try {
            BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(tabdata, configUrl);
            System.out.println("tabdata=" + tabdata);
            System.out.println("configUrl = " + configUrl);

            rb = Response.ok(f.getSession().getSessionString());
        } catch (IOException e) {
            rb = Response.status(204);
            return rb.build();
        }

        // Return results
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}

