package Core;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 1/20/12
 * Time: 3:37 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMLayers {
    private String title;
    private boolean legend;
    private String visible;
    private String url;
    private String location;

    public String getVisible() {
        if (visible.equals("1"))
            return "visible";
        else
            return "hidden";
    }

    public void setVisible(String visible) {
        this.visible = visible;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public boolean isLegend() {
        return legend;
    }

    public void setLegend(String legend) {
        if (legend.equals("1")) {
            this.legend = true;
        } else {
            this.legend = false;
        }
    }

    public void setActive(String active) {
        if (active.equals("1")) {
            this.legend = true;
        } else {
            this.legend = false;
        }
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }
}
