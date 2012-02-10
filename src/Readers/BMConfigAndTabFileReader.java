package Readers;

import Core.BMLayers;
import Core.BMLineStringReader;
import Core.BMRow;
import Core.BMSession;

import java.net.URL;
import java.util.ArrayList;
import java.io.*;
import javax.xml.parsers.*;

import org.w3c.dom.*;
import org.xml.sax.*;

/**
 * This class reads a BerkeleyMapper version 1 XML Configuration File and associated
 * Tab Delimited File. The Tab Delimited File is assumed NOT to have a header.  It is
 * not meant to replace all of the functionality of the previous XML configuration
 * file, but merely to replace essential functionality such as mapping column
 * headings to a TAB delimited text file without column headings.
 * Certain features are hard-coded since the version 1 XML configuration file is
 * deprecated and will never change.
 *
 * @author jdeck
 */
public class BMConfigAndTabFileReader extends BMSpatialFileReader {

    private URL configURL;

    public BMConfigAndTabFileReader(URL url, URL configURL) throws IOException {
        super(url, configURL);
        this.configURL = configURL;
        if (configURL != null) {
            columns = initHeader();
            execConfig();
        } else {
            execTab();
        }
    }

    public BMConfigAndTabFileReader(BMSession session) throws IOException {
        super(session);
        if (session.getMode() == session.CONFIG) {
            this.configURL = new URL("file:///" + session.getConfigFile().getAbsolutePath());
            columns = initHeader();
            execConfig();
        } else {
            execTab();
        }
    }

    public URL getConfigURL() {
        return configURL;
    }

    /**
     * Populate columns[] Array from XML Configuration File
     *
     * @return
     */
    private Object[] initHeader() {
        ArrayList columnArrayList = new ArrayList();

        Document doc = parseXmlFile(configURL, false);

        NodeList nl = doc.getElementsByTagName("concept");
        String alias, colorlist, datatype, order, videwlist;
        for (int i = 0; i < nl.getLength(); i++) {
            NamedNodeMap nnm = nl.item(i).getAttributes();
            alias = "";
            datatype = "";
            if (nnm != null) {
                for (int j = 0; j < nnm.getLength(); j++) {
                    Node attribute = nnm.item(j);
                    if (attribute.getNodeName().equalsIgnoreCase("alias")) {
                        alias = attribute.getNodeValue();
                    } else if (attribute.getNodeName().equalsIgnoreCase("datatype")) {
                        datatype = attribute.getNodeValue();
                    }
                }
                // Match Hardcoded DataTypes from BM1 specification to BM2
                if (datatype.equalsIgnoreCase("darwin:decimallatitude")) {
                    columnArrayList.add("Latitude");
                } else if (datatype.equalsIgnoreCase("darwin:decimallongitude")) {
                    columnArrayList.add("Longitude");
                } else if (datatype.equalsIgnoreCase("darwin:horizontaldatum")) {
                    columnArrayList.add("Datum");
                } else if (datatype.equalsIgnoreCase("darwin:CoordinateUncertaintyInMeters")) {
                    columnArrayList.add("ErrorRadiusInMeters");
                } else {
                    columnArrayList.add(alias);
                }
                //System.out.println("datatype=" + datatype + "/alias=" + alias);

            }
        }

        return columnArrayList.toArray();
    }

    /**
     * get The Specified KML BMLayers from this File
     *
     * @return
     */
    public Object[] getLayers() {
        ArrayList layerArrayList = new ArrayList();

        Document doc = parseXmlFile(configURL, false);
        String title, legend, active, url, location;
        NodeList nl = doc.getElementsByTagName("layer");
        for (int i = 0; i < nl.getLength(); i++) {
            NamedNodeMap nnm = nl.item(i).getAttributes();
            BMLayers l = new BMLayers();
            title = "";
            legend = "";
            active = "";
            url = "";
            location = "";
            if (nnm != null) {
                for (int j = 0; j < nnm.getLength(); j++) {
                    Node attribute = nnm.item(j);
                    if (attribute.getNodeName().equalsIgnoreCase("title")) {
                        l.setTitle(attribute.getNodeValue());
                    } else if (attribute.getNodeName().equalsIgnoreCase("legend")) {
                        l.setLegend(attribute.getNodeValue());
                    } else if (attribute.getNodeName().equalsIgnoreCase("active")) {
                        l.setVisible(attribute.getNodeValue());
                    } else if (attribute.getNodeName().equalsIgnoreCase("url")) {
                        l.setUrl(attribute.getNodeValue());
                    }
                }
                l.setLocation(nl.item(i).getTextContent());
                layerArrayList.add(l);
            }
        }
        // Return an Array of data that i can parse...
        return layerArrayList.toArray();
    }

    /**
     * execute the Config Option
     *
     * @throws IOException
     */
    private void execConfig() throws IOException {
        String strLine;
        // This Reader assumes that the TAB Delimited data file starts on row
        // 1 with no header
        numRows = 1;
        while ((strLine = reader.readLine()) != null) {
            BMRow r = new BMRow(numRows, columns, strLine);
            rows.add(r);
            numRows++;
        }
        //Close the input stream
        reader.close();
    }

    /**
     * execute the Tab Only Options
     *
     * @throws IOException
     */
    private void execTab() throws IOException {
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

    // Parses an XML file and returns a DOM document.
    // If validating is true, the contents is validated against the DTD
    // specified in the file.
    public static Document parseXmlFile(URL url, boolean validating) {
        try {
            // Create a builder factory
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setValidating(validating);

            // Create the builder and parse the file
            Document doc = factory.newDocumentBuilder().parse(url.openStream());//new File(filename));
            return doc;
        } catch (SAXException e) {
            e.printStackTrace();
            // A parsing error occurred; the xml input is not valid
        } catch (ParserConfigurationException e) {
            e.printStackTrace();

        } catch (IOException e) {
            e.printStackTrace();

        }
        return null;
    }
}
