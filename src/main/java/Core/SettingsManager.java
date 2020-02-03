package Core;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

/**
 * SettingsManager provides a generic way to configure BiSciCol core classes
 * from a properties file.  The basic idea is that any object that supports
 * the Configurable interface can be passed a SettingsManager, and it will then
 * use the SettingsManager to configure itself.  SettingsManager is implemented
 * as a singleton to ensure that all BiSciCol objects use common configuration
 * information.
 */
public class SettingsManager
{
    private static SettingsManager instance = null;

    private Properties props;
    private String propsfile;

    protected SettingsManager(String propsfile)
    {
        this.propsfile = propsfile;
    }

    /**
     * Get a reference to the global SettingsManager instance.  If this is the
     * first request for a SettingsManager instance, then a new SettingsManager
     * object will be created using the default properties file, which is
     * expected to be located in the "classes" directory of the project build
     * directory.
     *
     * @return A reference to the global SettingsManager object.
     */
    public static SettingsManager getInstance()
    {
    	return getInstance(Thread.currentThread().getContextClassLoader().getResource("berkeleymapper.props").getFile());
    }

    /**
     * Get a reference to the global SettingsManager object, specifying a
     * properties file to use.  If this is the first request for a
     * SettignsManager instance, then a new SettingsManager object will be
     * created using the specified properties file.  Otherwise, the existing
     * SettingsManager will be returned and the specified properties file is
     * ignored.
     *
     * @param propsfile A properties file to use in initializing the
     * SettingsManager.
     *
     * @return A reference to the global SettingsManager object.
     */
    public static SettingsManager getInstance(String propsfile)
    {
        if (instance == null)
            instance = new SettingsManager(propsfile);

        return instance;
    }

    /**
     * Get the path of the properties file associated with this SettingsManager.
     *
     * @return The path of the properties file used by this SettingsManager.
     */
    public String getPropertiesFile() {
        return propsfile;
    }

    /**
     * Specify a properties file for this SettingsManager to use.
     *
     * @param propsfile The path to a properties file.
     */
    public void setPropertiesFile(String propsfile) {
        this.propsfile = propsfile;
    }

    /**
     * Attempt to load the properties file associated with this SettingsManager.
     * This method must be called to properly initialize the SettingsManager
     * before it can be used by Configurable classes.
     *
     * @throws FileNotFoundException
     */
    public void loadProperties() throws FileNotFoundException {
        /*props = new Properties();

         // Get the inputStream
        InputStream inputStream = this.getClass().getClassLoader()
                .getResourceAsStream(propsfile);
        System.out.println(propsfile);
        System.out.println(inputStream.toString());*/
        props = new Properties();
        FileInputStream in = new FileInputStream(propsfile);

        // load the inputStream using the Properties
        try {
            props.load(in);
        } catch (IOException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }
    }

    /**
     * Get the value associated with the specified key.  If the key is not found
     * in the properties file, then an empty string is returned.
     *
     * @param key The key to search for in the properties file.
     *
     * @return The value associated with the key if it exists, otherwise, an
     * empty string.
     */
    public String retrieveValue(String key)
    {
        return retrieveValue(key, "");
    }

    /**
     * Get the value associated with the specified key; return a default value
     * if the key is not found.  The string specified by defaultval is returned
     * as the default value if the key cannot be found.
     *
     * @param key The key to search for in the properties file.
     * @param defaultval The default value to return if the key cannot be found.
     *
     * @return The value associated with the key if it exists, otherwise, the
     * specified default value.
     */
    public String retrieveValue(String key, String defaultval)
    {
        return props.getProperty(key, defaultval);
    }
}

