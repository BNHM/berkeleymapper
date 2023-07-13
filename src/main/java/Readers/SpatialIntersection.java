package Readers;

import java.io.File;
import java.io.IOException;
import java.util.*;

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

public class SpatialIntersection {
    /**
     * return a JSON result set of the frequency of points falling within a given polygon in a shapefile
     * @param shapefilePath  path to shapefile
     * @param columnName  column name to use values to assign frequency to
     * @param pointSet   Array of points
     * @return       JSON String
     * @throws IOException
     */
    public static String countPointsInPolygons(String shapefilePath, String columnName, Point[] pointSet)
            throws IOException {

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
                String polygonName = feature.getAttribute(columnName).toString();

                // Iterate over the points and check if each point falls within the polygon
                for (Point point : pointSet) {
                    if (geometry.contains(point)) {
                        // Increment the point count for the polygon
                        int count = pointCountMap.getOrDefault(polygonName, 0);
                        pointCountMap.put(polygonName, count + 1);
                    }
                }
            }
        }
        // Convert the result to JSON
        return mapToJson(pointCountMap);
    }
    
    /**
     * convert map to JSON
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
        * main file provides a working sample
        * @param args
        * @throws IOException
        * @throws ParseException
        */
       public static void main(String[] args) throws IOException, ParseException {
           String shapefilePath = "/Users/jdeck/Downloads/World_Countries_Generalized/World_Countries_Generalized.shp";
           String columnName = "COUNTRY";
           Point[] pointSet = createSamplePointSet();

           // Print the resultset
           System.out.println(countPointsInPolygons(shapefilePath, columnName, pointSet));
       }
}

