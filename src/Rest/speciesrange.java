package Rest;

import Utils.EncodingUtil;
import speciesrange.IUCN;

import javax.ws.rs.*;
import javax.ws.rs.core.Response;
import java.net.MalformedURLException;

/**
 * Called like:  http://berkeleymapper.berkeley.edu/v2/speciesrange/Plethodon+montanus/binomial/gaa_2011
 * @author jdeck
 */
@Path("speciesrange/{species}/{field}/{table}")
//@Path("speciesrange")
public class speciesrange {
    Response.ResponseBuilder rb;

    @GET
    @Produces("application/vnd.google-earth.kml+xml")
    public javax.ws.rs.core.Response speciesrange(
            @PathParam("species") String species,
            @PathParam("field") String field,
            @PathParam("table") String table) throws MalformedURLException {

        species = EncodingUtil.decodeURIComponent(species);
        field = EncodingUtil.decodeURIComponent(field);
        table = EncodingUtil.decodeURIComponent(table);
        try {
            IUCN kml = new IUCN();
            //rb = Response.ok(kml.getKML("Plethodon montanus", "binomial", "gaa_2011"));
            //System.out.println(species + ":"+field+":"+table);
            rb = Response.ok(kml.getKML(species, field, table));
        } catch (Exception e) {
            rb = Response.status(204);
            rb.header("Access-Control-Allow-Origin", "*");
            return rb.build();
        }
        rb.header("Access-Control-Allow-Origin", "*");
        return rb.build();
    }
}
