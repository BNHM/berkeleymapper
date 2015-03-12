package Rest;

import Core.BMSession;
import Readers.BMConfigAndTabFileReader;
import Readers.BMFileReader;
import Readers.BMSpatialFileReader;
import Renderers.BMRenderJSON;
import org.apache.commons.compress.compressors.CompressorException;
import org.apache.commons.compress.compressors.CompressorOutputStream;
import org.apache.commons.compress.compressors.CompressorStreamFactory;

import java.net.MalformedURLException;
import javax.ws.rs.*;
import java.io.IOException;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.ResponseBuilder;

import java.util.UUID;
import java.util.zip.*;
import java.io.*;

/**
 * "allpoints" service returns a JSON representation of all of the points
 * present for the given session.  The JSON format returns the following fields:
 * <p/>
 * line,lat,lng,radius,datum
 * <p/>
 * Example:
 * <br>http://localhost/v2/allpoints?session=SESSION_STRING
 * <br>OR
 * <br>http://localhost:8080/berkeleymapper/v2/allpoints?session=SESSION_STRING
 * <p/>
 * An error returns an empty response with status code = 204
 *
 * @author jdeck
 */
@Path("allpoints")
public class allpoints {
    ResponseBuilder rb;

    @GET
    @Produces("application/json")
    public Response getAllPoints(
            @QueryParam("session") String session,
            @QueryParam("gzip") String gzip) throws MalformedURLException {
        // Load the File
        BMSession sess = new BMSession(session);
        String filename = null;
        try {
            if (sess.getMode() == sess.CONFIG) {
                BMConfigAndTabFileReader f = new BMConfigAndTabFileReader(sess);
                String output = new BMRenderJSON().AllPoints(f.getMultiPointGeometry(), f);
                if (gzip.equalsIgnoreCase("true")) {
                    filename = compress(output, session);
                } else {
                    filename = nocompress(output, session);
                }
            } else {
                BMFileReader f = new BMSpatialFileReader(sess);
                if (gzip.equalsIgnoreCase("true")) {
                    filename = compress(new BMRenderJSON().AllPoints(f.getMultiPointGeometry(), null), session);
                } else {
                    filename = nocompress(new BMRenderJSON().AllPoints(f.getMultiPointGeometry(), null), session);
                }
            }
        } catch (IOException e) {
            rb = Response.status(204);
            rb.header("Access-Control-Allow-Origin", "*");
            return rb.build();
        } catch (CompressorException e) {
            rb = Response.status(204);
            rb.header("Access-Control-Allow-Origin", "*");
            return rb.build();
        }
        rb = Response.ok((Object) new File(filename));
        rb.header("Content-Disposition", "attachment; filename=\"" + filename + "\"");
        if (gzip.equalsIgnoreCase("true")) {
            rb.header("Content-Encoding", "gzip");
        }
        rb.header("Access-Control-Allow-Origin", "*");
        System.out.println("just about to send file back");
        return rb.build();
    }


    public static String compress(String str, String session) throws IOException, CompressorException {
        String filename = "/data/tmp/berkeleymapper/" + session + ".gz";
        ByteArrayOutputStream os = new ByteArrayOutputStream();
        FileOutputStream fout = new FileOutputStream(filename);
        CompressorOutputStream gzippedOut = new CompressorStreamFactory()
                .createCompressorOutputStream(CompressorStreamFactory.GZIP, fout);

        gzippedOut.write(str.getBytes());
        gzippedOut.close();
        os.flush();

        return filename;
    }

    public static String nocompress(String str, String session) throws IOException {
        String filename = "/data/tmp/berkeleymapper/" + session + ".txt";
        ByteArrayOutputStream os = new ByteArrayOutputStream();
        FileOutputStream fout = new FileOutputStream(filename);
        fout.write(str.getBytes());
        fout.close();
        os.flush();

        return filename;
    }
}
