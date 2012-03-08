package Core;

import java.awt.*;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 2/10/12
 * Time: 2:58 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMColor {

    public String key;
    private int red;
    private int green;
    private int blue;
    public String label;

    public static void main(String args[]) {
        BMColor c = new BMColor("h","i",255,0,0);
        System.out.println(c.getColor());
    }
    public BMColor(String key, String label, int red, int green, int blue) {
        this.key = key;
        this.red = red;
        this.green = green;
        this.blue = blue;
        this.label = label;
    }

    /**
     * Return color in hex format
     * @return
     */
    public String getColor () {
        if (red < 0 || red > 255) red = 0;
        if (green < 0 || green > 255) green = 0;
        if (blue < 0 || blue > 255) blue = 0;
        Color c = new Color(red,green,blue);
        String hexString =  Integer.toHexString( c.getRGB() & 0x00ffffff );
        while(hexString.length() < 6)
             hexString = "0" + hexString;
        return "#" + hexString;
    }
}
