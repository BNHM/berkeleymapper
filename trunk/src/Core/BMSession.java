/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package Core;

import com.eaio.uuid.UUID;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 *
 * @author jdeck
 */
public class BMSession {

    private String session = null;
    final private String filesLocation = "/tmp/ms_tmp/";
    private File file = null;

    /**
     * Used for testing purposes only
     * @param args 
     */
    public static void main(String args[]) {
        try {
            int i = 0;
            while (i < 1000) {
                BMSession bm = new BMSession(new URL("file:///foo.txt"));
                System.out.println(bm.getFile().getAbsoluteFile());
                i++;
            }
        } catch (IOException ex) {
            Logger.getLogger(BMSession.class.getName()).log(Level.SEVERE, null, ex);
        }

    }

    public BMSession(URL url) throws IOException {
        UUID uuid = new UUID();
        this.session = String.valueOf(uuid);
        this.file = new File(filesLocation + session);
        copy(url, file);
    }

    public BMSession(String session) {
        this.session = session;
        this.file = new File(filesLocation + session);
    }

    public File getFile() {
        return file;
    }

    public String getFilesLocation() {
        return filesLocation;
    }

    public String getSession() {
        return session;
    }

    /**
     * Save URL contents to a file.
     */
    public static boolean copy(URL from, File to) {
        BufferedInputStream urlin = null;
        BufferedOutputStream fout = null;
        try {
            int bufSize = 8 * 1024;
            urlin = new BufferedInputStream(
                    from.openConnection().getInputStream(),
                    bufSize);

            try {
                fout = new BufferedOutputStream(new FileOutputStream(to), bufSize);
            } catch (Exception e) {
                System.out.println("unable to write file into out output directory on server");
            }

            copyPipe(urlin, fout, bufSize);
        } catch (IOException ioex) {
            return false;
        } catch (SecurityException sx) {
            return false;
        } finally {
            if (urlin != null) {
                try {
                    urlin.close();
                } catch (IOException cioex) {
                }
            }
            if (fout != null) {
                try {
                    fout.close();
                } catch (IOException cioex) {
                }
            }
        }
        return true;
    }

    /**
     * Reads data from the input and writes it to the output, until the end of the input
     * stream.
     * 
     * @param in
     * @param out
     * @param bufSizeHint
     * @throws IOException
     */
    public static void copyPipe(InputStream in, OutputStream out, int bufSizeHint)
            throws IOException {
        int read = -1;
        byte[] buf = new byte[bufSizeHint];
        while ((read = in.read(buf, 0, bufSizeHint)) >= 0) {
            out.write(buf, 0, read);
        }
        out.flush();
    }
}
