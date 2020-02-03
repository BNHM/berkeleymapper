package Core;

import java.util.ArrayList;
import java.util.Iterator;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 2/10/12
 * Time: 3:08 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMColors {

    public String method;
    public String fieldname;
    public String label;
    public final static String FIELD = "field";                 // Specify colors by individual values
    public final static String DYNAMICFIELD = "dynamicfield";   // Dynamically assign colors from histogram
    public final static String DEFAULT = "default";   // Dynamically assign colors from histogram


    private ArrayList colors = new ArrayList();
    private String systemDefaultColor = "#FF0000";                    // Default color for system is red

    /**
     * Figure out the systemDefaultColor from a pattern of BMColors
     *
     * @param colors
     *
     * @return
     */
    public String defaultColor(BMColors colors) {
        Iterator colorslist = colors.getColors().iterator();
        while (colorslist.hasNext()) {
            BMColor c = (BMColor) colorslist.next();
            if (c.key.equalsIgnoreCase("default")) {
                return c.getColor();
            }
        }
        return systemDefaultColor;
    }

    public void setMethod(String method) {
        if (method.equalsIgnoreCase("field")) {
            this.method = FIELD;
        } else if (method.equalsIgnoreCase("dynamicfield")) {
            this.method = DYNAMICFIELD;
        } else {
            this.method = DEFAULT;
        }
    }

    public void setFieldname(String fieldname) {
        this.fieldname = fieldname;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public ArrayList getColors() {
        return colors;
    }

    public void addColor(BMColor c) {
        colors.add(c);
    }

    /**
     * Loop Field Names and assign Color mapping from XML Configuration File.
     *
     * @param coord
     * @param colors
     *
     * @return
     */
    public String FieldColor(BMRowClassifier coord, BMColors colors) {
        try {
            Iterator fields = coord.fields.iterator();

            while (fields.hasNext()) {


                BMField field = (BMField) fields.next();
                if (colors.fieldname.equalsIgnoreCase(field.getTitle())) {
                    Iterator colorslist = colors.getColors().iterator();
                    String userDefaultColor = "";
                    while (colorslist.hasNext()) {
                        BMColor c = (BMColor) colorslist.next();

                        if (c.key.trim().equalsIgnoreCase(field.getValue().trim())) {
                            return c.getColor();
                        }
                        if (c.key.equalsIgnoreCase("default")) {
                            userDefaultColor = c.getColor();
                        }
                    }
                    if (!userDefaultColor.equals("")) {
                        return userDefaultColor;
                    } else {
                        return systemDefaultColor;
                    }
                }
            }
            // don't ever return NULL, just return systemDefaultColor
            return colors.defaultColor(colors);
        } catch (Exception e) {
            return systemDefaultColor;
        }
    }
}

