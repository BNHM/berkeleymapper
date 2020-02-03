package Renderers;

import Readers.BMConfigAndTabFileReader;
import Readers.BMFileReader;
import Readers.BMSpatialFileReader;
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
    public String AllPoints(Geometry g, BMConfigAndTabFileReader f);
    /**
     * Given a line number and a BMSpatialFileReader file, return a representation
     * of the fields.
     * @param line
     * @param ptsFile
     * @return 
     */
    public String Record(int line, BMSpatialFileReader ptsFile);
    /**
     * Given a a SpatialDB file and a Geometry polygon, return a list of
     * records (and associated data, depending on renderer).
     * @param ptsFile
     * @param polygon
     * @return 
     */
    public String RecordsInPolygon(BMSpatialFileReader ptsFile, Geometry polygon);
    
    /**
     * Given a BMFileReader, figure out KMLLayers that user has specified
     * This is only applicable really for cases where a config file is specified
     * @param f
     * @return 
     */
    public String KMLLayers(BMConfigAndTabFileReader f);

    /**
     * Given a BMFileReader, get specification for marker colors
     * This is only applicable really for cases where a config file is specified
     * @param f
     * @return
     */
    public String Colors(BMConfigAndTabFileReader f);

    /**
     * Given a BMFileReader, return a String representing the logos in the reader
     * @param f
     * @return
     */
    public String Logos(BMConfigAndTabFileReader f);

}
