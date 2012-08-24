package Core;

import com.eaio.uuid.UUID;
import org.apache.commons.io.IOUtils;

import java.io.*;
import java.net.URL;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.nio.channels.Channels;
import java.nio.channels.ReadableByteChannel;


/**
 * Create a session by passing in a remote URL, copying file to local
 * server, and assigning a session variable.
 * <p/>
 * Remote file expects certain fields to identify location, including:
 * Latitude,Longitude,ErrorRadiusInMeters,Datum
 *
 * @author jdeck
 */
public class BMSession {

    private String session = null;
    final private String filesLocation = "/tmp/ms_tmp/";
    private File file = null;
    private File configFile = null;
    final public static int CONFIG = 1;
    final public static int FILE = 2;
    private int mode = 2;

    /**
     * Used for testing purposes only
     *
     * @param args
     */
    public static void main(String args[]) {
        try {
            // NOTE: encoding on darwin.berkeley.edu/amphibiaweb.txt is strange--
            // I spent 2 days researching this to no avail!!  It seems that this instance
            // has a strange encoding but could not find the reason.
            BMSession bm = new BMSession(new URL("http://berkeleymappertest.berkeley.edu/schemas/arctos.txt"), null);
            System.out.println(bm.getFile().getAbsoluteFile());
        } catch (IOException ex) {
            Logger.getLogger(BMSession.class.getName()).log(Level.SEVERE, null, ex);
        }

    }

    public BMSession(URL url, URL configURL) throws IOException {
        setSessionUUID();

        file = new File(filesLocation + session);

        if (configURL != null) {
            mode = CONFIG;
            configFile = new File(filesLocation + session + ".xml");

            copy(configURL, configFile);

        } else {
            mode = FILE;
        }
        //Timer t = new Timer();
        //t.printer("start");
        copy(url, file);
       // t.printer("copy");
        //commons_copy(url, file);
        //t.printer("commons_copy");
        //channel_copy(url,file);
        //t.printer("channel_copy");


    }


    public BMSession(String session) {
        this.session = session;
        this.file = new File(filesLocation + session);
        this.configFile = new File(filesLocation + session + ".xml");
        if (configFile != null && configFile.exists()) {
            mode = CONFIG;
        } else {
            mode = FILE;
        }
    }

    public int getMode() {
        return mode;
    }

    private void setSessionUUID() {
        this.session = String.valueOf(new UUID());
    }

    public File getConfigFile() {
        return configFile;
    }

    public File getFile() {
        return file;
    }

    public String getFilesLocation() {
        return filesLocation;
    }

    public String getSessionString() {
        return session;
    }

    public static void copy(URL url, File file) throws IOException {
        ReadableByteChannel rbc = Channels.newChannel(url.openStream());
        FileOutputStream fos = new FileOutputStream(file);
        fos.getChannel().transferFrom(rbc, 0, 1 << 24);
    }

    public static void commons_copy(URL url, File file) throws IOException {
        FileOutputStream fos = new FileOutputStream(file);
        IOUtils.copy(new BufferedInputStream(url.openStream()),
                new BufferedOutputStream(fos));

    }

    public static void channel_copy(URL url, File file) throws IOException {
        // allocate the stream ... only for example
        OutputStream output = null;
        output = new FileOutputStream(file);

        // get an  from the stream
        ReadableByteChannel inputChannel = Channels.newChannel(url.openStream());

        // copy the channels
        ChannelTools.fastChannelCopy(Channels.newChannel(url.openStream()), Channels.newChannel(output));
        // closing the channels
        inputChannel.close();
    }
}
