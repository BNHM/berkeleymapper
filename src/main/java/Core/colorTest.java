package Core;

import java.awt.*;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 3/16/12
 * Time: 5:08 PM
 * To change this template use File | Settings | File Templates.
 */
public class colorTest {
    public static void main(String args[]) {
        BMColor[] c = generateColors(200);
        for (int i = 0; i < c.length; i++) {
            System.out.println(c[i].getColor());
        }

    }

    public static BMColor[] generateColors(int n) {
        BMColor[] cols = new BMColor[n];
        for (int i = 0; i < n; i++) {
            Color c = Color.getHSBColor((float) i / (float) n, 0.85f, 1.0f);
            BMColor bmc = new BMColor("key" + i, "label" + i, c.getRed(), c.getGreen(), c.getBlue());
            cols[i] = bmc;
        }
        return cols;
    }
}
