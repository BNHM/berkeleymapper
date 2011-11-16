package Core;

import com.vividsolutions.jts.geom.GeometryFactory;

import java.io.*;
import java.net.URL;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 11/9/11
 * Time: 4:04 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMFile extends BMSpatialDB {

    public BMFile(String strUrl, GeometryFactory geometryFactory) throws IOException {
        super(geometryFactory);

        this.geometryFactory = geometryFactory;

        URL url = new URL(strUrl);

        BufferedReader br = new BufferedReader(
                    new InputStreamReader(
                            url.openStream()));
        // Open the file that is the first
       /* FileInputStream fstream = new FileInputStream(file);
        InputStreamReader is = new InputStreamReader()

        DataInputStream in = new DataInputStream(fstream);
        BufferedReader br = new BufferedReader(new InputStreamReader(in));*/
        String strLine;
        //Read File Line By Line
        while ((strLine = br.readLine()) != null) {
            if (numRows == 0) {
                header = new BMLineStringReader(strLine).toArray();
            } else {
                BMRow r = new BMRow(header, strLine);
                rows.add(r);
            }
            numRows++;
        }
        //Close the input stream
        br.close();
    }
}
