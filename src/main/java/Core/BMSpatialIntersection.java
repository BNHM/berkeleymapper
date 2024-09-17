package Core;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.*;

import Readers.BMConfigAndTabFileReader;
import org.geotools.data.DataStore;
import org.geotools.data.DataStoreFinder;
import org.geotools.data.Query;
import org.geotools.data.simple.SimpleFeatureCollection;
import org.geotools.feature.FeatureIterator;
import org.geotools.geometry.jts.JTSFactoryFinder;
import org.locationtech.jts.geom.*;
import org.locationtech.jts.io.ParseException;
import org.geotools.data.simple.SimpleFeatureSource;
import org.opengis.feature.simple.SimpleFeature;

public class BMSpatialIntersection {
    static long startTime = System.nanoTime();
    static boolean showMessages = false;
    static Integer spatialProcessingLimit = 100000;

    /**
     * return a JSON result set of the frequency of points falling within a given polygon in a shapefile
     *
     * @param pointSet      Array of points
     * @return JSON String
     * @throws IOException
     */
    public static String countPointsInPolygons(BMSession.ShapeFile shp, Point[] pointSet)
            throws IOException {
        String shapefilePath =  shp.getFileName();

        printTime("START counting points in Polygon for " + shapefilePath);

        File file = new File(shapefilePath);
        Map<String, Object> map = new HashMap<>();
        map.put("url", file.toURI().toURL());
        // I have written shapefile using ISO8859... for some reason the communication between
        // QGIS and geotools works better here.. does not handle UTF8
        Charset charset = Charset.forName("ISO-8859-1");
        map.put("charset", charset);

        DataStore dataStore = DataStoreFinder.getDataStore(map);
        String typeName = dataStore.getTypeNames()[0];
        SimpleFeatureSource featureSource = dataStore.getFeatureSource(typeName);
        // Retrieve the feature collection
        Query query = new Query(typeName);
        SimpleFeatureCollection features = featureSource.getFeatures(query);

        // Create a map to store the point count for each polygon
        Map<String, Integer> countryCountMap = new HashMap<>();
        Map<String, Integer> stateCountMap = new HashMap<>();
        Map<String, Integer> countyCountMap = new HashMap<>();
        Map<String, Integer> biomeCountMap = new HashMap<>();


        // Iterate over the features
        try (FeatureIterator<SimpleFeature> iterator = features.features()) {
            while (iterator.hasNext()) {
                SimpleFeature feature = iterator.next();

                Geometry geometry = (Geometry) feature.getDefaultGeometry();
                Geometry boundingBox = geometry.getEnvelope();
                String countryName = String.format(feature.getAttribute(shp.getCountryName()).toString());
                String stateName =   String.format(feature.getAttribute(shp.getStateName()).toString());
                //String countyName = String.format(feature.getAttribute(shp.getCountyName()).toString());
                String biomeName =   String.format(feature.getAttribute(shp.getBiomeName()).toString());
                for (Point point : pointSet) {
                    // first check if point is within the boundary
                    if (point.intersects(boundingBox)) {
                        if (geometry.contains(point)) {
                            int countCountry = countryCountMap.getOrDefault(countryName, 0);
                            countryCountMap.put(countryName, countCountry + 1);
                            int countState = stateCountMap.getOrDefault(stateName, 0);
                            stateCountMap.put(stateName, countState + 1);
                            //int countCounty = countyCountMap.getOrDefault(countyName, 0);
                            //countyCountMap.put(countyName, countCounty + 1);
                            int countBiome = biomeCountMap.getOrDefault(biomeName, 0);
                            biomeCountMap.put(biomeName, countBiome + 1);
                        }
                    }
                }
            }
        }
        dataStore.dispose();

        printTime("STOP");
        // Convert the result to JSON
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        sb.append("{\"alias\" : \"Country\", \"frequencies\" : [" + mapToJson(countryCountMap) + "]},");
        sb.append("{\"alias\" : \"State\", \"frequencies\" : [" + mapToJson(stateCountMap) + "]},");
        //sb.append("{\"alias\" : \"County\", \"frequencies\": [" + mapToJson(countyCountMap) + "]},");
        sb.append("{\"alias\" : \"Biome\", \"frequencies\" : [" + mapToJson(biomeCountMap) + "]}");
        sb.append("]");
        return sb.toString();
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
        for (Map.Entry<String, Integer> entry : map.entrySet()) {
            String key = entry.getKey();
            Integer value = entry.getValue();
            sb.append("{\"key\" : \"").append(key).append("\", \"value\" : ").append(value).append("}, ");
        }
        // Remove the trailing comma and space
        if (map.size() > 0) {
            sb.setLength(sb.length() - 2);
        }
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
     * Return an array of Point objects given an array of BMCoordinates,
     * and enforce a hard limit
     * @param bmCoordinates
     * @return
     */
    public static Point[] createPointSetFromCoordinates(BMCoordinate[] bmCoordinates) {
        int counter = bmCoordinates.length;
        if (bmCoordinates.length > spatialProcessingLimit) {
            counter = spatialProcessingLimit;
        }
        Point[] points = new Point[counter];

        for (int i = 0; i < counter; i++) {
            Coordinate coordinate = bmCoordinates[i];
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

        // Creating a new session
        BMSession sess = new BMSession(
                new URL("https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.txt"),
                new URL("https://raw.githubusercontent.com/BNHM/berkeleymapper/master/examples/arctostest.xml"));

        BMConfigAndTabFileReader file = new BMConfigAndTabFileReader(sess);

        Point[] pointSet = createPointSetFromCoordinates(file.getBMCoordinates());
                                                                             
        // Loop each shapefile
        Iterator it = sess.getShapeFiles().iterator();
        StringBuilder sb = new StringBuilder();
        while (it.hasNext()) {
            BMSession.ShapeFile shp = (BMSession.ShapeFile) it.next();
            sb.append(countPointsInPolygons(
                    shp,
                    pointSet
            ));
        }
        System.out.println(sb.toString());
    }
}

