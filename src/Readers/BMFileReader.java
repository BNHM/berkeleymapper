package Readers;

import Core.BMCoordinate;
import Core.BMRow;
import Core.BMSession;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.MultiPoint;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.net.URL;
import java.util.Iterator;

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

    public BMCoordinate[] expand(Geometry g);

    public BMSession getSession();

}
