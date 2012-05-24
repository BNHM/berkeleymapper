package Readers;

import Core.*;

import java.awt.*;
import java.net.URL;
import java.util.ArrayList;
import java.io.*;
import java.util.Collection;
import java.util.HashSet;
import java.util.Iterator;
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
    protected BMJoins joins = null;


    public BMConfigAndTabFileReader(URL url, URL configURL) throws IOException {
        super(url, configURL);
        this.configURL = configURL;
        if (configURL != null) {
            initHeader();
            execConfig();
        } else {
            execTab();
        }
    }

    public BMConfigAndTabFileReader(BMSession session) throws IOException {
        super(session);
        if (session.getMode() == session.CONFIG) {
            this.configURL = new URL("file:///" + session.getConfigFile().getAbsolutePath());
            initHeader();
            execConfig();
        } else {
            execTab();
        }
    }

    public URL getConfigURL() {
        return configURL;
    }

    /**
     * Populate columns and columnsAlias Array from XML Configuration File
     *
     * @return
     */
    private void initHeader() {
        ArrayList columnArrayList = new ArrayList();
        ArrayList columnAliasArrayList = new ArrayList();
        ArrayList viewListArrayList = new ArrayList();

        Document doc = parseXmlFile(configURL, false);


        // Structure linkbacks
        NodeList nlLinkback = doc.getElementsByTagName("linkback");
        for (int i = 0; i < nlLinkback.getLength(); i++) {
            NamedNodeMap nnm = nlLinkback.item(i).getAttributes();
            String linkurl = "", text = "", key1 = "", value1 = "", fieldname = "", method = "";

            if (nnm != null) {

                for (int j = 0; j < nnm.getLength(); j++) {
                    Node attribute = nnm.item(j);

                    if (attribute.getNodeName().equalsIgnoreCase("linkurl")) {
                        linkurl = attribute.getNodeValue();
                    } else if (attribute.getNodeName().equalsIgnoreCase("text")) {
                        text = attribute.getNodeValue();
                    } else if (attribute.getNodeName().equalsIgnoreCase("key1")) {
                        key1 = attribute.getNodeValue();
                    } else if (attribute.getNodeName().equalsIgnoreCase("value1")) {
                        value1 = attribute.getNodeValue();
                    } else if (attribute.getNodeName().equalsIgnoreCase("fieldname")) {
                        fieldname = attribute.getNodeValue();
                    } else if (attribute.getNodeName().equalsIgnoreCase("method")) {
                        method = attribute.getNodeValue();
                    }
                }

                recordLinkBack = new BMRecordLinkBack(linkurl, text, key1, value1, fieldname, method);

            }
        }

        NodeList nl = doc.getElementsByTagName("concept");
        String alias, colorlist, datatype, order, viewlist;
        for (int i = 0; i < nl.getLength(); i++) {
            NamedNodeMap nnm = nl.item(i).getAttributes();
            alias = "";
            datatype = "";
            viewlist = "";
            if (nnm != null) {
                for (int j = 0; j < nnm.getLength(); j++) {
                    Node attribute = nnm.item(j);
                    if (attribute.getNodeName().equalsIgnoreCase("alias")) {
                        alias = attribute.getNodeValue();
                    } else if (attribute.getNodeName().equalsIgnoreCase("datatype")) {
                        datatype = attribute.getNodeValue();
                    } else if (attribute.getNodeName().equalsIgnoreCase("viewlist")) {
                        viewlist = attribute.getNodeValue();
                    }
                }
                // Match Hardcoded DataTypes from BM1 specification to BM2
                if (datatype.equalsIgnoreCase("darwin:decimallatitude")) {
                    columnArrayList.add("Latitude");
                    columnAliasArrayList.add("Latitude");
                } else if (datatype.equalsIgnoreCase("darwin:decimallongitude")) {
                    columnArrayList.add("Longitude");
                    columnAliasArrayList.add("Longitude");
                } else if (datatype.equalsIgnoreCase("darwin:horizontaldatum")) {
                    columnArrayList.add("Datum");
                    columnAliasArrayList.add("Datum");
                } else if (datatype.equalsIgnoreCase("darwin:CoordinateUncertaintyInMeters")) {
                    columnArrayList.add("ErrorRadiusInMeters");
                    columnAliasArrayList.add("ErrorRadiusInMeters");
                } else {
                    columnArrayList.add(datatype);
                    if (alias != null && !alias.equals("")) {
                        columnAliasArrayList.add(alias);
                    } else {
                        columnAliasArrayList.add(datatype);
                    }
                }
                if (viewlist.equals("") || viewlist.equals("1")) {
                    viewListArrayList.add(true);
                } else {
                    viewListArrayList.add(false);
                }

            }
        }

        //columnArrayList.add("color");
        columns = columnArrayList.toArray();
        columnsAlias = columnAliasArrayList.toArray();
        viewList = viewListArrayList.toArray();
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
     * Return a BMColors object representing how to style color objects in map
     *
     * @return
     */
    public BMColors getColors() {
        // Set up initial color array components
        BMColors c = new BMColors();
        Document doc = parseXmlFile(configURL, false);
        NodeList nl = doc.getElementsByTagName("colors");
        for (int i = 0; i < nl.getLength(); i++) {
            NamedNodeMap nnm = nl.item(i).getAttributes();
            if (nnm != null) {
                for (int j = 0; j < nnm.getLength(); j++) {
                    Node attribute = nnm.item(j);
                    //System.out.println(attribute.getNodeName());
                    if (attribute.getNodeName().equalsIgnoreCase("method")) {
                        c.setMethod(attribute.getNodeValue());
                    } else if (attribute.getNodeName().equalsIgnoreCase("fieldname")) {
                        c.setFieldname(attribute.getNodeValue());
                    } else if (attribute.getNodeName().equalsIgnoreCase("label")) {
                        c.setLabel(attribute.getNodeValue());
                    }
                }
            }
        }

        // Color components
        if (c.method == null) {
            return null;
        } else if (c.method.equals(c.FIELD)) {
            //System.out.println("Fetching Colors by Field -- explicit representation by type");
            return getColorsByField(nl, c);
        } else if (c.method.equals(c.DYNAMICFIELD)) {
            //System.out.println("Fetching Colors by DynamicField");
            return getColorsByDynamicField(c);
        }
        return null;
    }

    /**
     * Determine the position of the particular title variable in an arraylist of fields
     *
     * @param title
     * @return
     */
    private Integer getBMFieldPosition(String title) {
        Iterator rowIt = rows.iterator();
        while (rowIt.hasNext()) {
            BMRow r = (BMRow) rowIt.next();
            Iterator it = r.getBMCoord().fields.iterator();
            Integer count = 0;
            while (it.hasNext()) {
                BMField f = (BMField) it.next();
                if (f.getTitle().equalsIgnoreCase(title)) {
                    return count;
                }
                count++;
            }
        }
        return -1;
    }

    /**
     * Get a list of unique values and assign a color ramp
     * Need to reed tab delimited field for the appropriate column and get a list of unique values
     *
     * @param c
     * @return
     */
    private BMColors getColorsByDynamicField(BMColors c) {

        // Get unique values in the dynamic field column using HashSet
        HashSet fieldHash = new HashSet();
        Integer position = getBMFieldPosition(c.fieldname);
        if (position < 0) return null;
        Iterator rowIt = rows.iterator();
        while (rowIt.hasNext()) {
            BMRow r = (BMRow) rowIt.next();
            BMField f = (BMField) r.getBMCoord().fields.get(position);
            fieldHash.add(f.getValue());
        }

        // Create a color ramp based on HashSet
        Iterator hashIt = fieldHash.iterator();
        int length = fieldHash.size();
        int count = 1;
        while (hashIt.hasNext()) {
            String field = (String) hashIt.next();
            Color color = Color.getHSBColor((float) count++ / (float) length, 0.85f, 1.0f);
            BMColor bmc = new BMColor(field, field, color.getRed(), color.getGreen(), color.getBlue());
            c.addColor(bmc);
        }

        return c;
    }

    /**
     * Get a list of colors as specified by individual XML Field mappings
     *
     * @param nl
     * @param c
     * @return
     */
    private BMColors getColorsByField(NodeList nl, BMColors c) {
        for (int i = 0; i < nl.getLength(); i++) {
            // Fetch colors nodes
            NodeList colors = nl.item(i).getChildNodes();
            for (int k = 0; k < colors.getLength(); k++) {
                Node n = colors.item(k);
                if (n != null && n.getNodeName().equalsIgnoreCase("color")) {
                    NamedNodeMap nnmColors = n.getAttributes();
                    String key = "", label = "";
                    int red = 0, green = 0, blue = 0;

                    if (nnmColors != null) {

                        for (int l = 0; l < nnmColors.getLength(); l++) {

                            Node attribute = nnmColors.item(l);
                            if (attribute.getNodeName().equalsIgnoreCase("key")) {
                                key = attribute.getNodeValue();
                            } else if (attribute.getNodeName().equalsIgnoreCase("label")) {
                                label = attribute.getNodeValue();
                            } else if (attribute.getNodeName().equalsIgnoreCase("red")) {
                                red = Integer.valueOf(attribute.getNodeValue());
                            } else if (attribute.getNodeName().equalsIgnoreCase("green")) {
                                green = Integer.valueOf(attribute.getNodeValue());
                            } else if (attribute.getNodeName().equalsIgnoreCase("blue")) {
                                blue = Integer.valueOf(attribute.getNodeValue());
                            }
                        }
                        BMColor bmc = new BMColor(key, label, red, green, blue);
                        c.addColor(bmc);
                    }
                }
            }

        }
        return c;
    }

    /**
     * execute the Config Option
     *
     * @throws IOException
     */
    private void execConfig() throws IOException {

        String strLine;

        // Detect the Join Condition & Define Spatial Columns
        Document doc = parseXmlFile(configURL, false);
        NodeList jnl = doc.getElementsByTagName("join");
        if (jnl.getLength() > 0) {
            joins = new BMJoins(jnl);
        }

        // This Reader assumes that the TAB Delimited data file starts on row
        // 1 with no header
        numRows = 1;
        while ((strLine = reader.readLine()) != null) {
            //BMRow r = new BMRow(numRows, columns, columnsAlias, viewList, strLine, joins);
            BMRow r = new BMRow(numRows, this, strLine, joins);
            if (r.getBMCoord() != null) {
                rows.add(r);
            }
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
                BMRow r = new BMRow(numRows, this, strLine, null);
                if (r.getBMCoord() != null) {
                    rows.add(r);
                }

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
