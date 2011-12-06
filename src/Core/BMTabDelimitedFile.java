package Core;

import com.vividsolutions.jts.geom.GeometryFactory;

import java.io.*;
import java.net.URL;
import java.util.ArrayList;

/**
 * This is the main file object for BerkeleyMapper, reads tab delimited
 * data files with a header line indicating column names.
 * User: jdeck
 * Date: 11/9/11
 * Time: 4:04 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMTabDelimitedFile extends BMDelimitedFileReader {

    public BMTabDelimitedFile(URL url) throws IOException {
        super(url);
        init();
    }

    public BMTabDelimitedFile(BMSession session) throws FileNotFoundException, IOException {
        super(session);
        init();
    }

    private void init() throws IOException {
        String strLine;
        //Read File Line By Line
        while ((strLine = reader.readLine()) != null) {
            if (numRows == 0) {
                columns = new BMLineStringReader(strLine).toArray();
            } else {
                BMRow r = new BMRow(columns, strLine);
                rows.add(r);
            }
            numRows++;
        }
        //Close the input stream
        reader.close();
    }
}
