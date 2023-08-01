package Readers;

import Core.*;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.Map;

import org.apache.commons.math3.stat.Frequency;
import org.geotools.geometry.jts.JTSFactoryFinder;
import org.locationtech.jts.geom.*;

import static org.apache.commons.lang3.StringEscapeUtils.escapeJson;
import static org.apache.commons.lang3.StringUtils.*;

/**
 * This class runs spatial operations on the given file.  It acts as
 * a superclass for all of the file readers.
 *
 * @author jdeck
 */
public class BMSpatialFileReader implements BMFileReader {
    protected BufferedReader reader = null;
    private BMSession session;

    public int numRows = 0;
    public Object[] columns;
    public Object[] columnsAlias;
    public Object[] viewList;
    protected ArrayList rows = new ArrayList();
    protected GeometryFactory geometryFactory;
    public BMRecordLinkBack recordLinkBack = null;


    /**
     * Pass in a file URL and configURL (this is done the first time).  Sets the session.
     */
    public BMSpatialFileReader(URL url, URL configUrl) throws IOException {
        this.geometryFactory = new GeometryFactory();
        this.session = new BMSession(url, configUrl);
        setReader();
    }

    /**
     * Pass in tabData configURL (this is done the first time).  Sets the session.
     */
    public BMSpatialFileReader(String tabdata, URL configUrl) throws IOException {
        this.geometryFactory = new GeometryFactory();
        this.session = new BMSession(tabdata, configUrl);
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
     * Get the frequency of field values for Column for one particular column
     *
     * @param columnName
     * @return
     */
    private StringBuilder getValueFrequencyForColumn(String columnName, String columnAlias) {
        Iterator allRowsIt = rows.iterator();
        Frequency f = new Frequency(String.CASE_INSENSITIVE_ORDER);
        while (allRowsIt.hasNext()) {
            BMRow row = (BMRow) allRowsIt.next();
            Iterator fieldsIt = ((BMRowClassifier)row.getBMCoord()).fields.iterator();

            while (fieldsIt.hasNext()) {
                BMField field = (BMField) fieldsIt.next();
                if (field.getTitle().equalsIgnoreCase(columnName)) {
                    // abreviate long strings which cause big files
                    f.addValue(abbreviate(field.getValue(), 40));
                    //f.addValue(field.getValue());
                }
            }
        }

        
        StringBuilder sb = new StringBuilder();
        sb.append("\n\t{ \"alias\":\"" + columnAlias + "\",\"frequencies\" : [\n");
        final Iterator<Map.Entry<Comparable<?>, Long>> iter = f.entrySetIterator();
        while (iter.hasNext()) {
            final Map.Entry<Comparable<?>, Long> entry = iter.next();
            String key = entry.getKey().toString();
            String value = entry.getValue().toString();
            // escape json using apache commons lib
            key = escapeJson(key);

            sb.append("\t\t{\"column\":\"" + key + "\",\"count\":\"" + value + "\"}");
            if (iter.hasNext()) {
                sb.append(",\n");
            }
        }
        sb.append("]\n\t}");
        return sb;
    }

    /**
     * Get all column value frequencies
     *
     * @return
     */
    public String getValueFrequencies() {
        StringBuilder sb = new StringBuilder();
        sb.append("[\n");
        for (int i = 0; i < columns.length; i++) {
            if ((boolean) viewList[i]) {
                if (!columns[i].toString().contains("latitude") &&
                        !columns[i].toString().contains("longitude") &&
                        !columns[i].toString().contains("Latitude") &&
                        !columns[i].toString().contains("Longitude") &&
                        !columns[i].toString().contains("related")) {
                    sb.append(getValueFrequencyForColumn(
                            columns[i].toString(),
                            columnsAlias[i].toString()));
                    sb.append(",");
                }
            }
        }
        // remove trailing comman... we do not know positions of printed columns
        // so inserting trailing comman and then deleting it each time is safest way
        sb.deleteCharAt(sb.length() - 1);

        sb.append("\n]");
        return sb.toString();
    }


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
        Iterator it = rows.iterator();
        while (it.hasNext()) {
            BMRow r = (BMRow) it.next();
            if (i == ((BMRowClassifier)r.getBMCoord()).line) {
                return r;
            }
        }
        //BMRow r = (BMRow) rows.get(rowNum);
        return null;
    }

    public BMCoordinate[]  getBMCoordinates() {
        Iterator i = rows.iterator();
                int length = rows.toArray().length;
                //Coordinate[] coord = new Coordinate[length];
                BMCoordinate[] bmCoordinates = new BMCoordinate[length];
                int count = 0;
        while (i.hasNext()) {
            BMRow r = (BMRow) i.next();
            bmCoordinates[count++] = (BMCoordinate) r.getBMCoord();
        }
        return bmCoordinates;
    }
    /**
     * This returns a MultiPoint geometry representation the entire set of rows.
     *
     * @return
     */
    public Geometry getMultiPointGeometry() {
        Iterator i = rows.iterator();
        int length = rows.toArray().length;
        //Coordinate[] coord = new Coordinate[length];
        BMCoordinate[] coord = new BMCoordinate[length];
        int count = 0;
        GeometryFactory geometryFactory = JTSFactoryFinder.getGeometryFactory();

        while (i.hasNext()) {
            BMRow r = (BMRow) i.next();
            //coord[count++] = (BMCoordinate) r.getBMCoord();
            //coord[count++] =
                   Point c=  geometryFactory.createPoint((BMCoordinate) r.getBMCoord());
                   coord[count++] = (BMCoordinate) c.getCoordinate();
        }
        Geometry g =  geometryFactory.createMultiPoint(coord);
        return g;
        //return  geometryFactory.createMultiPoint(coord);
        //return geometryFactory.createMultiPoint(expand(g));
    }

    /*


        // Create an array of Point objects from the coordinates
        GeometryFactory geometryFactory = JTSFactoryFinder.getGeometryFactory();
        Point[] points = new Point[coordinates.length];
        for (int i = 0; i < coordinates.length; i++) {
            points[i] = geometryFactory.createPoint(coordinates[i]);
        }
        return points;
     */

    /**
     * Return full set of points that are in a polygon
     *
     * @param g
     * @return
     */
    public BMRowClassifier[] BMPointsInPolygon(Geometry g) {
        Geometry uniquePoints = g.intersection(this.getMultiPointGeometry());
        // i want to return an array of BMCoordinate[]
        return expand(uniquePoints);
        //return geometryFactory.createMultiPoint(expand(uniquePoints));
    }

    /**
     * Expands a set of Coordinates to match incoming set, along with fields.
     * This is necessary since JTS functions typically only return unique sets
     * of coordinates from query operations.  We want to expand to original duplicate
     * sets of points along with metadata.
     *
     * @param g
     * @return
     */
    public BMRowClassifier[] expand(Geometry g) {
        Coordinate[] c = g.getCoordinates();
        ArrayList BMCoordinates = new ArrayList();
        for (int i = 0; i < c.length; i++) {
            Coordinate cu = c[i];
            Iterator iRow = this.rows.iterator();
            while (iRow.hasNext()) {
                BMRow r = (BMRow) iRow.next();
                if (r.getBMCoord() != null && r.getBMCoord().equals(cu)) {
                    BMCoordinates.add(r.getBMCoord());
                }
            }
        }
        return (BMRowClassifier[]) BMCoordinates.toArray(new BMRowClassifier[BMCoordinates.size()]);
    }


}
