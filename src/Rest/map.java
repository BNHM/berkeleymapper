package Rest;


import Core.BMTabDelimitedFile;
import Renderers.BMRenderKML;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.GeometryFactory;

import java.net.MalformedURLException;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.io.IOException;
import java.net.URL;


// REST Service
@Path("v2/map")
public class map {

    @GET
    @Produces("text/xml")
    public String getRelations(
            @QueryParam("tabfile") String tabfile,
                        @QueryParam("option") String option

    ) throws MalformedURLException {
        GeometryFactory geometryFactory = new GeometryFactory();

        // Load the File
        URL url =  new URL(tabfile);
        BMTabDelimitedFile f = null;
        try {
            f = new BMTabDelimitedFile(url);
        } catch (IOException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }

        // Adapt the postgres clustering fxn here to duplicate BerkeleyMapper functionality

        // Options for KML files
        // default, small, errorradii, fast
        if (option.equalsIgnoreCase("small")) {
            // small markers (better when there are many)
        } else if (option.equalsIgnoreCase("errorradii")) {
            // draw w/ error radiii

        }else {
            // default, as is
        }
        
        // Render Results
        //new BMRenderKML(f.getMultiPointGeometry());
        // new BMRenderKML(f.getMultiPointGeometry());
        return new BMRenderKML(f.getMultiPointGeometry()).toString();
    }
}
