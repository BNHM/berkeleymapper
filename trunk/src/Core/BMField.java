package Core;

/**
 * Represent a common field value with a title and a value
 * @author jdeck
 */
public class BMField {

    protected String title;
    protected String titleAlias;
    protected String value;

    public BMField(String title, String titleAlias, String value) {
        this.title = title;
        this.value = value;
        this.titleAlias = titleAlias;
    }

    public String getTitle() {
        return title;
    }

    public String getValue() {
        return value;
    }

    public String getTitleAlias() {
        return titleAlias;
    }
   
}
