package Readers;

import Core.BMCoordinate;
import Core.BMRowClassifier;
import Core.BMRow;
import Core.BMSession;
import org.locationtech.jts.geom.Geometry;

/**
 * Interface for all the File Reading Classes, expects a call to exec() to run
 *
 * @author jdeck
 */
public interface BMFileReader {

    //void exec() throws IOException;

    public BMRow getRowAt(int i);

    public org.locationtech.jts.geom.Geometry getMultiPointGeometry();

    public BMCoordinate[] getBMCoordinates();

    public BMRowClassifier[] BMPointsInPolygon(Geometry g);

    public BMRowClassifier[] expand(Geometry g);

    public BMSession getSession();

}
