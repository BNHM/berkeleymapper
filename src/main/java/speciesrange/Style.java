package speciesrange;

public class Style {
    String color;
    Double width;
    String id;

    public Style(String color, Double width, String id) {
        this.color = color;
        this.width = width;
        this.id = id;
    }

    public String getColor() {
        return color;
    }

    public Double getWidth() {
        return width;
    }

    public String getId() {
        return id;
    }

    /**
     * Format style input as KML
     * @return
     */
    public String getStyleAsKML() {
        String style = "  <Style id=\"" + id + "\">\n";
        style += "    <LineStyle>\n";
        style += "      <width>" + width + "</width>\n";
        style += "    </LineStyle>\n";

        style += "    <PolyStyle>\n";
        style += "      <color>" + color + "</color>\n";
        style += "    </PolyStyle>\n";

        style += "  </Style>\n";
        return style;
    }

}

