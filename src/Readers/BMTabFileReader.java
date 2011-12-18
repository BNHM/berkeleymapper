package Readers;

import Core.BMLineStringReader;
import Core.BMRow;
import Core.BMSession;

import java.io.*;
import java.net.URL;

/**
 * Reads tab delimited
 * data files with a header line indicating column names.
 * User: jdeck
 * Date: 11/9/11
 * Time: 4:04 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMTabFileReader extends BMSpatialFileReader {

    public BMTabFileReader(URL url) throws IOException {
        super(url,null);
    }

    public BMTabFileReader(BMSession session) throws IOException {
        super(session);
    }

    public void exec() throws IOException {
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
