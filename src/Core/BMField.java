package Core;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 11/9/11
 * Time: 3:31 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMField {
    private String title;
    private String value;

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
