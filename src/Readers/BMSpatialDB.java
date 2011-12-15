package Readers;

import Core.BMCoordinate;
import Core.BMRow;
import com.vividsolutions.jts.geom.Coordinate;
import com.vividsolutions.jts.geom.Geometry;
import com.vividsolutions.jts.geom.GeometryFactory;
import com.vividsolutions.jts.geom.MultiPoint;
import java.util.ArrayList;
import java.util.Iterator;

/**
 * This class runs spatial operations on the given file.  It acts as
 * a superclass for all of the file readers.
 * @author jdeck
 */
public class BMSpatialDB {

    public int numRows = 0;
    protected Object[] columns;
    protected ArrayList rows = new ArrayList();
    protected GeometryFactory geometryFactory;

    public BMSpatialDB() {
        this.geometryFactory = new GeometryFactory();
    }

   public BMRow getRowAt(int i) {
       // Need to calculate actual line Number we are asking for
       // numRows is actual number of rows and rows.size is the number of the
       // Array.  Add another 1 since array starts at 0.
       int offset = (numRows - rows.size()) + 1;
       int rowNum = i - offset;
       BMRow r =  (BMRow)rows.get(rowNum);
       return r;       
   }

    /**
     * This returns a MultiPoint geometry representation of the ArrayList of rows
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
     * Return full set of points that are in a polygon-- JTS only returns unique points
     * on intersection.  This method returns whole points.
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
     * @param g
     */
    private BMCoordinate[] expand(Geometry g) {
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
