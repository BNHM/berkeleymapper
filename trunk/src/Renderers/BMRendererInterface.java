package Renderers;

import Readers.BMSpatialDB;
import com.vividsolutions.jts.geom.Geometry;

/**
 * Interface for rendering output results in different formats
 * @author jdeck
 */
public interface BMRendererInterface {
    /**
     * Given a Geometry File return a representation of the coordinates
     * @param g
     * @return 
     */
    public String AllPoints(Geometry g);
    /**
     * Given a line number and a BMSpatialDB file, return a representation
     * of the fields.
     * @param line
     * @param ptsFile
     * @return 
     */
    public String Record(int line, BMSpatialDB ptsFile);
    /**
     * Given a a SpatialDB file and a Geometry polygon, return a list of
     * records (and associated data, depending on renderer).
     * @param ptsFile
     * @param polygon
     * @return 
     */
    public String RecordsInPolygon(BMSpatialDB ptsFile, Geometry polygon);
}
