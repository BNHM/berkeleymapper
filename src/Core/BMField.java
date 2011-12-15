package Core;

/**
 * Represent a common field value
 * @author jdeck
 */
public class BMField {

    protected String title;
    protected String value;

    public BMField(String title, String value) {
        this.title = title;
        this.value = value;
    }

    public String getTitle() {
        return title;
    }

    public String getValue() {
        return value;
    }

   
}
