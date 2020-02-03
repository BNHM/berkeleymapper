package Core;

import org.w3c.dom.*;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 4/13/12
 * Time: 11:44 AM
 * To change this template use File | Settings | File Templates.
 */
public class BMJoins {

    private String method = "";
    private String fieldname1 = "";
    private String fieldname2 = "";
    public final static String COUNTYMATCH = "countymatch";     // Dynamically assign colors by US County
    USCounty usCounty = new USCounty();

    public BMJoins(NodeList jnl) {
        for (int i = 0; i < jnl.getLength(); i++) {
            NamedNodeMap nnm = jnl.item(i).getAttributes();
            if (nnm != null) {
                for (int j = 0; j < nnm.getLength(); j++) {
                    Node attribute = nnm.item(j);
                    if (attribute.getNodeName().equalsIgnoreCase("method")) {
                        method = attribute.getNodeValue();
                    } else if (attribute.getNodeName().equalsIgnoreCase("fieldname1")) {
                        fieldname1 = attribute.getNodeValue();
                    } else if (attribute.getNodeName().equalsIgnoreCase("fieldname2")) {
                        fieldname2 = attribute.getNodeValue();
                    }
                }
            }
        }

    }

    public String getMethod() {
        return method;
    }

    public String getFieldname1() {
        return fieldname1;
    }

    public String getFieldname2() {
        return fieldname2;
    }
}
