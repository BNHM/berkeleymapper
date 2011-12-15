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
public class BMFileReader extends BMSpatialDB {

    protected BufferedReader reader = null;
    BMSession session;

    /**
     * Pass in a URL (this is done the first time)
     */
    public BMFileReader(URL url) throws IOException {
        this.session = new BMSession(url);
        setReader();
    }

    /**
     * Pass in a BMSession (when a session exists)
     * @param file
     * @throws FileNotFoundException 
     */
    public BMFileReader(BMSession session) throws FileNotFoundException {
        this.session = session;
        setReader();
    }

    private void setReader() throws FileNotFoundException {
        reader = new BufferedReader(
                new FileReader(
                session.getFile()));
    }
    public BMSession getSession() {
        return session;
    }
}
