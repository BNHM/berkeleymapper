package Core;

import java.util.ArrayList;

/**
 * Read a line stream.
 * @author jdeck
 */
public class BMLineStringReader extends ArrayList {
    public BMLineStringReader(String line) {
        String output[] = line.split("[\t]");
        for (int i = 0; i < output.length; i++) {
            this.add(output[i]);
        }
    }
}
