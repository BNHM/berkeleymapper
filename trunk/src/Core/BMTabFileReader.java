package Core;

import com.vividsolutions.jts.geom.GeometryFactory;

import java.io.*;
import java.net.URL;
import java.util.ArrayList;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Reads tab delimited
 * data files with a header line indicating column names.
 * User: jdeck
 * Date: 11/9/11
 * Time: 4:04 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMTabFileReader extends BMFileReader {

    public BMTabFileReader(URL url) throws IOException {
        super(url);
        init();
    }

    public BMTabFileReader(BMSession session) throws FileNotFoundException, IOException {
        super(session);
        init();
    }

    private void init() throws IOException {
        String strLine;
        //Read File Line By Line
        while ((strLine = reader.readLine()) != null) {
            numRows++;
            if (numRows == 1) {
                columns = new BMLineStringReader(strLine).toArray();
            } else {
                BMRow r = new BMRow(numRows, columns, strLine);
                rows.add(r);
            }
        }
        //Close the input stream
        reader.close();
    }
}
