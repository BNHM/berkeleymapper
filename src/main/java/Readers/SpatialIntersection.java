package Readers;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.util.*;

import Core.BMSession;
import com.vividsolutions.jts.geom.impl.CoordinateArraySequenceFactory;
import org.geotools.data.DataStore;
import org.geotools.data.DataStoreFinder;
import org.geotools.data.Query;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.feature.FeatureIterator;
import org.geotools.geometry.jts.JTS;
import org.geotools.geometry.jts.JTSFactoryFinder;
import org.locationtech.jts.geom.*;
import org.locationtech.jts.io.ParseException;
import org.geotools.data.simple.SimpleFeatureSource;
import org.opengis.feature.simple.SimpleFeature;

public class SpatialIntersection {
    static long startTime = System.nanoTime();
    static boolean showMessages = false;

    /**
     * return a JSON result set of the frequency of points falling within a given polygon in a shapefile
     *
     * @param shapefilePath path to shapefile
     * @param columnName    column name to use values to assign frequency to
     * @param pointSet      Array of points
     * @return JSON String
     * @throws IOException
     */
    public static String countPointsInPolygons(String shapefilePath, String columnName, Point[] pointSet)
            throws IOException {
        printTime("START counting points in Polygon for " + shapefilePath);

        File file = new File(shapefilePath);
        Map<String, Object> map = new HashMap<>();
        map.put("url", file.toURI().toURL());

        DataStore dataStore = DataStoreFinder.getDataStore(map);
        String typeName = dataStore.getTypeNames()[0];
        SimpleFeatureSource featureSource = dataStore.getFeatureSource(typeName);
        // Retrieve the feature collection
        Query query = new Query(typeName);
        SimpleFeatureCollection features = featureSource.getFeatures(query);

        // Create a map to store the point count for each polygon
        Map<String, Integer> pointCountMap = new HashMap<>();

        // Iterate over the features
        try (FeatureIterator<SimpleFeature> iterator = features.features()) {
            while (iterator.hasNext()) {
                SimpleFeature feature = iterator.next();

                Geometry geometry = (Geometry) feature.getDefaultGeometry();
                Geometry boundingBox = geometry.getEnvelope();
                String polygonName = feature.getAttribute(columnName).toString();
                for (Point point : pointSet) {
                    // first check if point is within the boundary
                    if (point.intersects(boundingBox)) {
                        if (geometry.contains(point)) {
                            // Increment the point count for the polygon
                            int count = pointCountMap.getOrDefault(polygonName, 0);
                            pointCountMap.put(polygonName, count + 1);
                        }
                    }
                }
            }
        }
        dataStore.dispose();

        printTime("STOP");
        // Convert the result to JSON
        return mapToJson(pointCountMap);
    }

    public static Envelope calculateBoundingBox(Point[] points) {
        if (points == null || points.length == 0) {
            throw new IllegalArgumentException("Input Point array is empty or null.");
        }

        double minX = Double.MAX_VALUE;
        double maxX = Double.MIN_VALUE;
        double minY = Double.MAX_VALUE;
        double maxY = Double.MIN_VALUE;

        for (Point point : points) {
            Coordinate coordinate = point.getCoordinate();
            double x = coordinate.getX();
            double y = coordinate.getY();

            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        return new Envelope(minX, maxX, minY, maxY);
    }

    /**
     * convert map to JSON
     *
     * @param map
     * @return
     */
    private static String mapToJson(Map<String, Integer> map) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        for (Map.Entry<String, Integer> entry : map.entrySet()) {
            String key = entry.getKey();
            Integer value = entry.getValue();
            sb.append("\"").append(key).append("\": ").append(value).append(", ");
        }
        // Remove the trailing comma and space
        if (map.size() > 0) {
            sb.setLength(sb.length() - 2);
        }
        sb.append("}");
        return sb.toString();
    }

    /**
     * create a sample set of points
     *
     * @return
     */
    private static Point[] createSamplePointSet() {
        // Example usage
        Coordinate[] coordinates = new Coordinate[]{
                new Coordinate(-118, 37),
                new Coordinate(-117, 36),
                new Coordinate(0, 52),
                new Coordinate(21, 52),
                new Coordinate(-119, 38)
        };

        // Create an array of Point objects from the coordinates
        GeometryFactory geometryFactory = JTSFactoryFinder.getGeometryFactory();
        Point[] points = new Point[coordinates.length];
        for (int i = 0; i < coordinates.length; i++) {
            points[i] = geometryFactory.createPoint(coordinates[i]);
        }
        return points;
    }

    /**
     * Input a JTS MultiPoint, which the rest of BerkeleyMapper uses, and return
     * an array of  geotools Point Coords
     *
     * @param multiPoint
     * @param limit
     * @return
     */
    private static Point[] createPointSetFromCoordinates(com.vividsolutions.jts.geom.MultiPoint multiPoint, int limit) {
        com.vividsolutions.jts.geom.Coordinate[] coordinates = multiPoint.getCoordinates();

        int counter = coordinates.length;
        if (coordinates.length > limit) {
            counter = limit;
        }
        Point[] points = new Point[counter];

        for (int i = 0; i < counter; i++) {
            com.vividsolutions.jts.geom.Coordinate coordinate = coordinates[i];
            GeometryFactory geometryFactory = new GeometryFactory();
            Point point = geometryFactory.createPoint(new Coordinate(coordinate.y, coordinate.x));
            points[i] = point;
        }
        return points;
    }

    public static void printTime(String message) {
        if (showMessages) {
            long endTime = System.nanoTime();
            long elapsedTime = endTime - startTime;
            // Convert nanoseconds to seconds
            double elapsedTimeInSeconds = elapsedTime / 1_000_000_000.0;
            System.out.println( elapsedTimeInSeconds + " seconds. " + message);
        }
    }

    /**
     * main file provides a working sample
     *
     * @param args
     * @throws IOException
     * @throws ParseException
     */
    public static void main(String[] args) throws IOException, ParseException {
             /*
           String shapefilePath = "/Users/jdeck/Downloads/World_Countries_Generalized/World_Countries_Generalized.shp";
           String columnName = "COUNTRY";
           Point[] pointSet = createSamplePointSet();
           */

        // Creating a new session
        BMSession sess = new BMSession(
                new URL("https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.txt"),
                new URL("https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.xml"));

        BMConfigAndTabFileReader file = new BMConfigAndTabFileReader(sess);

        Point[] pointSet = createPointSetFromCoordinates(file.getMultiPointGeometry(), sess.pointLimitSpatialProcessing);

        // Loop each shapefile
        Iterator it = sess.getShapeFiles().iterator();
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        while (it.hasNext()) {
            BMSession.ShapeFile shp = (BMSession.ShapeFile) it.next();

            sb.append("{\"alias\":\"" + shp.getAliasName()+"\", \"frequencies\": [");
            sb.append(countPointsInPolygons(
                    shp.getFileName(),
                    shp.getColumnName(),
                    pointSet
            ));
            sb.append("]}");
            if (it.hasNext()) {
                sb.append(",");
            }
        }
        sb.append("]");
        System.out.println(sb.toString());
    }
}

