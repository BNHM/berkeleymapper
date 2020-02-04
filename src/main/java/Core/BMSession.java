package Core;

import com.eaio.uuid.UUID;
import org.apache.commons.io.IOUtils;

import java.io.*;
import java.net.URL;
import java.util.Properties;
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
    //final private String filesLocation = "/home/jdeck/webserver_tmp/berkeleymapper/";
    private static String filesLocation = "";
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
            // BMSession bm = new BMSession(new URL("http://berkeleymappertest.berkeley.edu/schemas/arctos.txt"), null);
            try (InputStream input = BMSession.class.getClassLoader().getResourceAsStream("config.properties")) {
                       Properties prop = new Properties();
                       filesLocation = prop.getProperty("filesLocation");
                   } catch (IOException e) {
                       System.out.println("unable to read properties file");
                       e.printStackTrace();
                   }
            BMSession bm = new BMSession(new URL("https://biscicol.org/bcid"), null);

            System.out.println(bm.getFile().getAbsoluteFile());
        } catch (IOException ex) {
            Logger.getLogger(BMSession.class.getName()).log(Level.SEVERE, null, ex);
        }

    }

    /**
     * Create a session using a URL for filedata
     * @param url
     * @param configURL
     * @throws IOException
     */
    public BMSession(URL url, URL configURL) throws IOException {
        setProps();

        setSessionUUID();

        file = new File(filesLocation + session);

        if (configURL != null) {
            mode = CONFIG;
            configFile = new File(filesLocation + session + ".xml");

            copy(configURL, configFile);

        } else {
            mode = FILE;
        }

        copy(url, file);
    }

    /**
     * Create a session using tabdata that we already have
     * @param tabdata
     * @param configURL
     * @throws IOException
     */
    public BMSession(String tabdata, URL configURL) throws IOException {
        setProps();

        setSessionUUID();

        file = new File(filesLocation + session);

        if (configURL != null) {
            mode = CONFIG;
            configFile = new File(filesLocation + session + ".xml");

            copy(configURL, configFile);

        } else {
            mode = FILE;
        }

        copy(tabdata, file);
    }

    public BMSession(String session) {
        setProps();
        this.session = session;
        this.file = new File(filesLocation + session);
        this.configFile = new File(filesLocation + session + ".xml");
        if (configFile != null && configFile.exists()) {
            mode = CONFIG;
        } else {
            mode = FILE;
        }
    }

    public void setProps() {
        try (InputStream input = BMSession.class.getClassLoader().getResourceAsStream("config.properties")) {
            Properties prop = new Properties();
            this.filesLocation = prop.getProperty("filesLocation");
        } catch (IOException e) {
            System.out.println("unable to read properties file");
            e.printStackTrace();
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

    public static void copy(String data, File file) throws IOException {
        FileOutputStream fop = null;
        try {
            fop = new FileOutputStream(file);

            // if file doesnt exists, then create it
            if (!file.exists()) {
                file.createNewFile();
            }

            // get the content in bytes
            byte[] contentInBytes = data.getBytes();

            fop.write(contentInBytes);
            fop.flush();
            fop.close();

            System.out.println("Done");

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                if (fop != null) {
                    fop.close();
                }
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
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
