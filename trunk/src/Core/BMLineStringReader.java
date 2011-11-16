package Core;

import java.util.ArrayList;
import java.util.StringTokenizer;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 11/9/11
 * Time: 3:44 PM
 * To change this template use File | Settings | File Templates.
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
