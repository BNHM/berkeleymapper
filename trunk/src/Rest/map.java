package Rest;


import Core.BMFile;
import Renderers.BMRenderKML;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.GeometryFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import java.io.IOException;


@Path("v2/map")
public class map {

    @GET
    @Produces("text/xml")
    public String getRelations(
            @QueryParam("tabfile") String tabfile
    ) {
        GeometryFactory geometryFactory = new GeometryFactory();

        // Load the File
        BMFile f = null;
        try {
            f = new BMFile(tabfile, geometryFactory);
        } catch (IOException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }

        // Adapt the postgres clustering fxn here to duplicate BerkeleyMapper functionality

        // Render Results
        //new BMRenderKML(f.getMultiPointGeometry());
        // new BMRenderKML(f.getMultiPointGeometry());
        return new BMRenderKML(f.getMultiPointGeometry()).toString();
    }
}
