package Readers;

import Core.BMCoordinate;
import Core.BMRow;
import Core.BMSession;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.MultiPoint;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Iterator;

/**
 * This class runs spatial operations on the given file.  It acts as
 * a superclass for all of the file readers.
 *
 * @author jdeck
 */
public class BMSpatialFileReader implements BMFileReader {
    protected BufferedReader reader = null;
    BMSession session;

    public int numRows = 0;
    protected Object[] columns;
    protected ArrayList rows = new ArrayList();
    protected GeometryFactory geometryFactory;

    //public BMSpatialFileReader() {
    //    this.geometryFactory = new GeometryFactory();
    //}

    /**
     * Pass in a file URL (this is done the first time).  Sets the session.
     */
    //public BMSpatialFileReader(URL url) throws IOException {
   //     this.geometryFactory = new GeometryFactory();
   //     this.session = new BMSession(url);
   //     setReader();
   // }

    /**
     * Pass in a file URL and configURL (this is done the first time).  Sets the session.
     */
    public BMSpatialFileReader(URL url, URL configUrl) throws IOException {
        this.geometryFactory = new GeometryFactory();
        this.session = new BMSession(url, configUrl);
        setReader();
    }

    /**
     * Pass in a BMSession when a session exists and reads that.
     *
     * @param session
     * @throws FileNotFoundException
     */
    public BMSpatialFileReader(BMSession session) throws FileNotFoundException {
        this.geometryFactory = new GeometryFactory();
        this.session = session;
        setReader();
    }

    private void setReader() throws FileNotFoundException {
        reader = new BufferedReader(
                new FileReader(
                        session.getFile()));
    }

    public BMSession getSession() {
        return session;
    }

    //public void exec() throws IOException {
   //     //To change body of implemented methods use File | Settings | File Templates.
   // }

    /**
     * Get the BMRow at the given line number
     *
     * @param i
     * @return
     */
    public BMRow getRowAt(int i) {

        // Add one to offset since we're comparing array to line number
        int offset = 1;
        // Offset for FILE mode since there is a header row
        if (session.getMode() == session.FILE) {
            offset = (numRows - rows.size());
        }
        int rowNum = i - offset;
        BMRow r = (BMRow) rows.get(rowNum);
        return r;
    }

    /**
     * This returns a MultiPoint geometry representation the entire set of rows.
     *
     * @return
     */
    public MultiPoint getMultiPointGeometry() {
        Iterator i = rows.iterator();
        int length = rows.toArray().length;
        Coordinate[] coord = new Coordinate[length];
        int count = 0;
        while (i.hasNext()) {
            BMRow r = (BMRow) i.next();
            coord[count++] = r.getBMCoord();
        }
        return geometryFactory.createMultiPoint(coord);
    }

    /**
     * Return full set of points that are in a polygon
     *
     * @param g
     * @return
     */
    public Geometry BMPointsInPolygon(Geometry g) {
        Geometry uniquePoints = g.intersection(this.getMultiPointGeometry());
        return geometryFactory.createMultiPoint(expand(uniquePoints));
    }

    /**
     * Expands a set of Coordinates to match incoming set, along with fields.
     * This is necessary since JTS functions typically only return unique sets
     * of coordinates from query operations.  We want to expand to original duplicate
     * sets of points along with metadata.
     *
     * @param g
     */
    public BMCoordinate[] expand(Geometry g) {
        Coordinate[] c = g.getCoordinates();
        ArrayList BMCoordinates = new ArrayList();
        for (int i = 0; i < c.length; i++) {
            Coordinate cu = c[i];
            Iterator iRow = this.rows.iterator();
            while (iRow.hasNext()) {
                BMRow r = (BMRow) iRow.next();
                if (r.getBMCoord().equals(cu)) {
                    BMCoordinates.add(r.getBMCoord());
                }
            }
        }
        return (BMCoordinate[]) BMCoordinates.toArray(new BMCoordinate[BMCoordinates.size()]);
    }


}
