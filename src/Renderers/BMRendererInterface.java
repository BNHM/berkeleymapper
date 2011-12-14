/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package Renderers;

import Core.BMSpatialDB;
import com.vividsolutions.jts.geom.Geometry;


/**
 *
 * @author jdeck
 */
public interface BMRendererInterface {
    public String AllPoints(Geometry g);
    public String Record(int line, BMSpatialDB ptsFile);
    public String RecordsInPolygon(BMSpatialDB ptsFile, Geometry polygon);
}
