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
    public final static String FIELD = "field";                // Specify colors by individual values
    public final static String DYNAMICFIELD = "dynamicfield";  // Dynamically assign colors from histogram
    private ArrayList colors = new ArrayList();

    // Default Color for all markers
    public String defaultColor() {
        return "#FF0000";
    }

    public void setMethod(String method) {
        if (method.equalsIgnoreCase("field")) {
            this.method = FIELD;
        }
        if (method.equalsIgnoreCase("dynamicfield")) {
            this.method = DYNAMICFIELD;
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
     * @param coord
     * @param colors
     * @return
     */
    public String FieldColor(BMCoordinate coord, BMColors colors) {
        Iterator fields = coord.fields.iterator();
        while (fields.hasNext()) {
            BMField field = (BMField) fields.next();
            if (colors.method.equals(colors.FIELD)) {
                if (colors.fieldname.equalsIgnoreCase(field.getTitle())) {
                    Iterator colorslist = colors.getColors().iterator();
                    String userdefaultcolor = "";
                    while (colorslist.hasNext()) {
                        BMColor c = (BMColor) colorslist.next();
                        if (c.key.equalsIgnoreCase(field.getValue())) {
                            return c.getColor();
                        }
                        if (c.key.equalsIgnoreCase("default")) {
                            userdefaultcolor =  c.getColor();
                        }
                    }
                    if (!userdefaultcolor.equals("")) {
                        return userdefaultcolor;
                    }   else {
                        return colors.defaultColor();
                    }
                }
            }
        }
        return null;
    }
}
