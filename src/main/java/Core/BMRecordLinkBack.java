package Core;

import org.apache.commons.lang3.text.StrSubstitutor;

import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * This Class currently assumes method="root" as described in the BM1 documentation
 */
public class BMRecordLinkBack {

    private String linkurl = "";
    private String text = "";
    private String key1 = "";
    private String value1 = "";
    private String fieldname = "";
    private String method = "";
    private String value1Value = "";
    //private ArrayList<HashMap> keyValues;
    private Map keyMap;

    public BMRecordLinkBack(String linkurl, String text, String key, String value, String fieldname, String method) {
        this.linkurl = linkurl;
        this.text = text;
        this.key1 = key;
        this.value1 = value;
        this.fieldname = fieldname;
        this.method = method;
    }

    public BMRecordLinkBack(String linkurl, String text, String fieldname) {
        this.method = "pattern";
        this.linkurl = linkurl;
        this.text = text;
        this.fieldname = fieldname;
    }

    public String getLinkurl() {
        return linkurl;
    }

    public String getFieldname() {
        return fieldname;
    }

    public String getValue1() {
        return value1;
    }

    /*
    * used for method=pattern, sets multiple values
    */
    public void setMap(Map map) {
        this.keyMap = map;
    }

    /**
     * used for method=pattern, allows for multiple values
     *
     * @return
     */
    public Map getMap() {
        return keyMap;
    }

    public void setValue(String val) {
        this.value1Value = val;
    }

    public String getMethod() {
        return method;
    }

    /**
     * Returns a URL representation based on values and method
     *
     * @return
     */
    public String getURL() {
        String delimiter = "?";
        if (linkurl.indexOf("?") > 0) {
            delimiter = "&";
        }

        String href = "";
        if (method.equalsIgnoreCase("root")) {
            href = linkurl + delimiter + key1 + "=" + value1Value;
            if (href.trim().equals("")) {
                return "";
            }
            return "<a href=\"" + href + "\" target=\"_blank\">" + text + "</a>";
        } else if (method.equalsIgnoreCase("pattern")) {
            href = new StrSubstitutor(keyMap).replace(linkurl);
            if (href.trim().equals("")) {
                return "";
            }
            return "<a href=\"" + href + "\" target=\"_blank\">" + text + "</a>";
        } else {
            return null;
        }
    }

    public static void main(String[] args) {
        String linkurl = "http://portal.vertnet.org/o/${institutioncode}/${collectioncode}?id=${catalognumbertext}";

        BMRecordLinkBack lb = new BMRecordLinkBack(linkurl, "some text", null);
        Map map = new HashMap();
        //map.put("institutioncode","");
        map.put("collectioncode", "Herp");
        map.put("catalognumbertext", "12345");
        lb.setMap(map);
        System.out.println(lb.getURL());
    }
}
