/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package Core;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.net.URL;

/**
 *
 * @author jdeck
 */
public class BMDelimitedFileReader extends BMSpatialDB {
        protected BufferedReader reader = null;

      /**
     * Pass in a URL (this is done the first time)
     */
    public BMDelimitedFileReader(URL url) throws IOException {
        BMSession session = new BMSession(url);
        setReader(session);       
    }

    /**
     * Pass in a BMSession (when a session exists)
     * @param file
     * @throws FileNotFoundException 
     */
    public BMDelimitedFileReader(BMSession session) throws FileNotFoundException {
        setReader(session);
    }

    public void setReader(BMSession session) throws FileNotFoundException {
        reader = new BufferedReader(
                new FileReader(
                session.getFile()));
    }
}
