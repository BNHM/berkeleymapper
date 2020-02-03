package Readers;

import Core.BMRowClassifier;
import Core.BMRow;
import Core.BMSession;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.MultiPoint;

/**
 * Interface for all the File Reading Classes, expects a call to exec() to run
 *
 * @author jdeck
 */
public interface BMFileReader {

    //void exec() throws IOException;

    public BMRow getRowAt(int i);

    public MultiPoint getMultiPointGeometry();

    public Geometry BMPointsInPolygon(Geometry g);

    public BMRowClassifier[] expand(Geometry g);

    public BMSession getSession();

}
