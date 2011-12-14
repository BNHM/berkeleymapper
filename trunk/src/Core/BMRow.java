package Core;

import java.util.ArrayList;
import java.util.Iterator;

/**
 * Created by IntelliJ IDEA.
 * User: jdeck
 * Date: 11/9/11
 * Time: 3:40 PM
 * To change this template use File | Settings | File Templates.
 */
public class BMRow {
    /*
    private double Latitude;
    private double Longitude;
    private double ErrorRadiusInMeters;
    private String Datum;
    private ArrayList fields = new ArrayList();
     */

    private BMCoordinate BMCoord;

    /**
     * Encapsulate knowledge of a row that has been passed in.  Stores all fields and has convenience
     * functions to get Latitude, Longitude, ErrorRadiusInMeters, and Datum
     * @param header
     * @param line
     */
    public BMRow(int line, Object[] header, String lineStr) {
        double Latitude = 0;
        double Longitude = 0;
        double ErrorRadiusInMeters = 0;
        String Datum = "";
        ArrayList fields = new ArrayList();

        BMLineStringReader lsr = new BMLineStringReader(lineStr);

        Iterator lsri = lsr.iterator();

        int fieldNum = 0;
        while (lsri.hasNext()) {
            String value = (String) lsri.next();
            String title = null;
            try {
                title = (String) header[fieldNum++];
            } catch (ArrayIndexOutOfBoundsException e) {
                System.err.println("Title Elements out of bounds");
            }
            if (title != null && value != null) {
                // Assign application specific field names
                // TODO: how to recognize these from BM1 config files (need type??)
                if (title.equalsIgnoreCase("Latitude")) {
                    Latitude = round(Double.parseDouble(value), 5);
                } else if (title.equalsIgnoreCase("Longitude")) {
                    Longitude = round(Double.parseDouble(value), 5);
                } else if (title.equalsIgnoreCase("ErrorRadiusInMeters")) {
                    ErrorRadiusInMeters = Double.parseDouble(value);
                } else if (title.equalsIgnoreCase("Datum")) {
                    Datum = value;
                }
                fields.add(new BMField(title, value));
            }
        }
        if (Latitude != 0 && Longitude != 0) {
            this.BMCoord = new BMCoordinate(line, Latitude, Longitude, ErrorRadiusInMeters, Datum, fields);
        }
    }

    public BMCoordinate getBMCoord() {
        return BMCoord;
    }

    public static Double round(Double valueToRound, int numberOfDecimalPlaces) {
        Double multipicationFactor = Math.pow(10, numberOfDecimalPlaces);
        Double interestedInZeroDPs = valueToRound * multipicationFactor;
        return Math.round(interestedInZeroDPs) / multipicationFactor;
    }
}
