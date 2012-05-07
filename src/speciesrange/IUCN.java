package speciesrange;

import Core.SettingsManager;

import java.io.FileNotFoundException;
import java.sql.*;


/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 4/18/12
 * Time: 1:22 PM
 * To change this template use File | Settings | File Templates.
 */


public class IUCN {

    static String connectionURL;
    static Connection conn = null;
    static String username;
    static String password;
    static String driver;

    public IUCN() {
        SettingsManager sm;
        sm = SettingsManager.getInstance();
        try {
            sm.loadProperties();
        } catch (FileNotFoundException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }
        password = sm.retrieveValue("password");
        //driver = sm.retrieveValue("driver");
        username = sm.retrieveValue("username");
        connectionURL = sm.retrieveValue("connectionURL");

        try {
            Class.forName("org.postgresql.Driver");
            conn = DriverManager.getConnection(connectionURL, username, password);
        } catch (ClassNotFoundException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        } catch (SQLException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }
    }

    public void close() throws SQLException {
        conn.close();
    }

    /**
     * Return kml for a scientific name and a particular table
     * @param name
     * @param table
     * @return
     * @throws SQLException
     */
    public String getKML(String name, String scientificNameColumn, String table) throws Exception {
        String kml = "";
        Style style = new Style("7dff0000",1.5,"styleElement");

        String sql = "SELECT askml(the_geom) as kml FROM " + table + " WHERE " + scientificNameColumn + " ='" + name + "'";
        System.out.println(sql);
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery(sql);
        kml += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                "<kml xmlns=\"http://www.opengis.net/kml/2.2\">\n" +
                "<Document>\n";
        kml += style.getStyleAsKML();

        boolean found = false;
        while (rs.next())  {
            kml += "  <Placemark>\n";
            kml += "    <name>" + name + "</name>\n";
            kml += "    <styleUrl>#styleElement</styleUrl>\n";
            kml += "    " + rs.getString("kml");
            kml += "  </Placemark>\n";
            found = true;
        }
        kml += "</Document>\n" +
                "</kml>";
        if (!found) {
            throw new Exception("unable to find data for " + name);
        }
        return kml;
    }

    public static void main(String args[]) {
        IUCN kml = new IUCN();
        try {
            System.out.println(kml.getKML("Plethodon montanus", "binomial", "gaa_2011"));
        } catch (SQLException e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        } catch (Exception e) {
            e.printStackTrace();  //To change body of catch statement use File | Settings | File Templates.
        }


    }
}
