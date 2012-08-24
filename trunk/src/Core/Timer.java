package Core;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 8/23/12
 * Time: 5:26 PM
 * To change this template use File | Settings | File Templates.
 */
public class Timer {
    long start;
    long last;
    long elapsedTimeMillis;

    public Timer() {
        start = System.currentTimeMillis();
        last = start;
    }

    public void printer(String note) {
        System.out.println(note + ": " + incrementTime() + " s, " + elapsedTime() + " total s");
        last = System.currentTimeMillis();
    }

    private String elapsedTime() {
        elapsedTimeMillis = System.currentTimeMillis() - start;
        float elapsedTimeSec = elapsedTimeMillis / 1000F;
        //System.out.println(elapsedTimeSec + "");
        return elapsedTimeSec + "";
    }
    private String incrementTime() {
        float incTimeMillis = System.currentTimeMillis() - last;
        float incTimeSec = incTimeMillis / 1000F;
        //System.out.println(incTimeMillis);
        return incTimeSec + "";
    }
}