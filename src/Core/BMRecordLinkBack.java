package Core;

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

    public BMRecordLinkBack(String linkurl, String text, String key, String value, String fieldname, String method) {
        this.linkurl = linkurl;
        this.text = text;
        this.key1 = key;
        this.value1 = value;
        this.fieldname = fieldname;
        this.method = method;
    }

    public String getFieldname() {
        return fieldname;
    }
    public String getValue1() {
        return value1;
    }

    public void setValue(String val) {
        this.value1Value = val;
    }

    public String getURL() {
        if (method.equalsIgnoreCase("root")) {
            return "<a href=\"" + linkurl + "&" + key1 + "=" + value1Value + "\" target=\"_blank\">" + text + "</a>";
        } else {
            return null;
        }
    }
}
