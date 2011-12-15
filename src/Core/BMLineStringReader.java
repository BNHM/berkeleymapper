package Core;

import java.util.ArrayList;
import java.util.StringTokenizer;

/**
 * Read a line stream.
 * @author jdeck
 */
public class BMLineStringReader extends ArrayList {
    public BMLineStringReader(String line) {
        StringTokenizer st = new StringTokenizer(line,"\t",false);
        while (st.hasMoreTokens()) {
            String t = st.nextToken().toString();
            this.add(t);
        }
    }
}
