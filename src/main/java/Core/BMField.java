package Core;

/**
 * Represent a common field value with a title and a value
 * @author jdeck
 */
public class BMField {

    protected String title;
    protected String titleAlias;
    protected String value;
    protected Boolean view;

    public BMField(String title, String titleAlias, Boolean view, String value) {
        this.title = title;
        this.value = value;
        this.titleAlias = titleAlias;
        this.view = view;
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

    public Boolean getView() {
        // Latitude/Longitude must be returned
        if (getTitle().equals("Latitude") || getTitle().equals("Longitude") ) {
            return true;
        }
        return view;
    }
}
